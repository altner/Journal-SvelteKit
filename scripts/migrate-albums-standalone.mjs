// One-time data migration for the "albums fully independent of post" refactor (see
// tasks/todo.md "Album komplett unabhängig von Post machen"). Copies existing album photos
// (photo.album_id) into the new album_photo table, then cleans up the now-obsolete carrier posts
// (the old "photos added to album" status posts, and origin posts that become empty once their
// album photos move out).
//
// IMPORTANT — run this BEFORE deploying the new app code, and BEFORE running `npm run db:push`.
// This script reads the OLD columns (post.album_id, post.is_status_post, album.origin_post_id,
// photo.album_id) directly via raw SQL — they still exist physically in the DB even though the
// new schema.ts no longer declares them, as long as nobody has dropped them yet. If `db:push` runs
// first with the new schema, drizzle-kit may drop those columns before this script ever reads
// them, losing the data this migration needs.
//
// Order:
//   1. node --env-file=.env scripts/migrate-albums-standalone.mjs           (dry run, no writes)
//   2. review the log output
//   3. node --env-file=.env scripts/migrate-albums-standalone.mjs --apply   (writes for real)
//   4. deploy the new app code
//   5. optionally, once you've confirmed everything looks right on the site:
//      ALTER TABLE post DROP COLUMN album_id;
//      ALTER TABLE post DROP COLUMN is_status_post;
//      ALTER TABLE photo DROP COLUMN album_id;
//      ALTER TABLE album DROP COLUMN origin_post_id;
import { createClient } from '@libsql/client';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/migrate-albums-standalone.mjs');
	process.exit(1);
}

const apply = process.argv.includes('--apply');
const client = createClient({ url: process.env.DATABASE_URL });

async function run(sql, args = []) {
	if (apply) await client.execute({ sql, args });
}

console.log(apply ? '=== APPLY MODE — writing changes ===' : '=== DRY RUN — no changes will be written (pass --apply to write) ===');

await run(`
	CREATE TABLE IF NOT EXISTS album_photo (
		id TEXT PRIMARY KEY,
		filename TEXT NOT NULL,
		original_name TEXT,
		width INTEGER,
		height INTEGER,
		album_id TEXT NOT NULL REFERENCES album(id) ON DELETE CASCADE,
		position INTEGER NOT NULL DEFAULT 0,
		created_at INTEGER NOT NULL
	)
`);
console.log(apply ? 'Ensured album_photo table exists.' : 'Would ensure album_photo table exists.');

const albums = (await client.execute('SELECT id, title FROM album')).rows;
console.log(`Found ${albums.length} album(s).`);

let sharedPhotoWarnings = 0;

for (const albumRow of albums) {
	const albumId = albumRow.id;
	const photos = (
		await client.execute({ sql: 'SELECT * FROM photo WHERE album_id = ?', args: [albumId] })
	).rows;
	console.log(`\nAlbum "${albumRow.title}" (${albumId}): ${photos.length} photo(s) to copy into album_photo`);

	for (const p of photos) {
		await run(
			`INSERT INTO album_photo (id, filename, original_name, width, height, album_id, position, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[p.id, p.filename, p.original_name, p.width, p.height, albumId, p.position, p.created_at]
		);
	}

	// Posts that were flagged as contributing to this specific album — the origin post (real,
	// user-authored) and/or any addPhotos-created status posts. A photo whose owning post is NOT
	// in this set (post.album_id never got set on it) came from the old /photos
	// "lose Fotos als Album" feature, which reused an unrelated post's existing photo — deleting
	// that photo row would remove content from a post this migration has no business touching, so
	// those are left alone (just duplicated into album_photo too) and flagged for manual review.
	const contributingPosts = (
		await client.execute({ sql: 'SELECT * FROM post WHERE album_id = ?', args: [albumId] })
	).rows;
	const contributingPostIds = new Set(contributingPosts.map((p) => p.id));

	for (const p of photos) {
		if (!contributingPostIds.has(p.post_id)) {
			sharedPhotoWarnings++;
			console.log(
				`  ⚠ photo ${p.id} belongs to post ${p.post_id}, which was never marked as contributing ` +
					`to this album (likely came from the old /photos "lose Fotos als Album" selection) — ` +
					`left in place on its post, only duplicated into album_photo. Review manually if you want it gone from there.`
			);
		}
	}

	for (const post of contributingPosts) {
		if (post.is_status_post) {
			console.log(`  deleting status post ${post.id} ("${post.title}") — its photos are already copied`);
			await run('DELETE FROM post_tag WHERE post_id = ?', [post.id]);
			await run('DELETE FROM photo WHERE post_id = ?', [post.id]);
			await run('DELETE FROM post_block WHERE post_id = ?', [post.id]);
			await run('DELETE FROM post WHERE id = ?', [post.id]);
			continue;
		}

		// Real origin post — its own photos (for this album) are safe to remove from `photo` since
		// this exact post is what we're evaluating (no cross-post duplication risk, unlike the
		// shared-photo warning case above).
		await run('DELETE FROM photo WHERE post_id = ? AND album_id = ?', [post.id, albumId]);

		const remainingPhotos = Number(
			(
				await client.execute({
					sql: 'SELECT count(*) AS c FROM photo WHERE post_id = ?',
					args: [post.id]
				})
			).rows[0].c
		);
		const textBlocks = Number(
			(
				await client.execute({
					sql: `SELECT count(*) AS c FROM post_block WHERE post_id = ? AND type = 'text' AND text IS NOT NULL AND trim(text) != ''`,
					args: [post.id]
				})
			).rows[0].c
		);
		const hasTitle = Boolean(post.title && String(post.title).trim() !== '');

		if (remainingPhotos === 0 && textBlocks === 0 && !hasTitle) {
			console.log(`  post ${post.id} has no content left after removing its album photos — deleting`);
			await run('DELETE FROM post_tag WHERE post_id = ?', [post.id]);
			await run('DELETE FROM post_block WHERE post_id = ?', [post.id]);
			await run('DELETE FROM post WHERE id = ?', [post.id]);
		} else {
			console.log(`  keeping post ${post.id} as a standalone post (has its own title/text/other photos)`);
			// Its photos-only block(s) for this album are now empty — drop the empty shell(s), same
			// as pruneEmptyPhotoBlocks does for a manual single-photo delete.
			await run(
				`DELETE FROM post_block
				 WHERE post_id = ? AND type = 'photos'
				 AND id NOT IN (SELECT block_id FROM photo WHERE block_id IS NOT NULL)`,
				[post.id]
			);
		}
	}
}

console.log(`\nDone.${sharedPhotoWarnings > 0 ? ` ${sharedPhotoWarnings} shared-photo case(s) flagged above for manual review.` : ''}`);
if (!apply) console.log('This was a dry run — re-run with --apply to write these changes.');
