// One-time, idempotent migration: moves posts created via the Micropub checkin endpoint
// (post.isCheckin = 1) out of post/post_block/photo/post_tag into their own checkin/
// checkin_block/checkin_photo tables (same ids/slugs preserved so existing links keep working),
// then deletes the migrated rows from the post-side tables. Checkins aren't taggable (see
// tasks/todo.md), so any post_tag rows for a migrated post are discarded, not carried over —
// there is no checkin_tag table.
// Usage: node --env-file=.env scripts/migrate-checkins-to-own-table.mjs
import { createClient } from '@libsql/client';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/migrate-checkins-to-own-table.mjs');
	process.exit(1);
}

const client = createClient({ url: process.env.DATABASE_URL });

async function main() {
	const { rows: posts } = await client.execute(
		"select id, title, slug, author_id, latitude, longitude, location_place, location_country, location_name, created_at from post where is_checkin = 1"
	);

	let migrated = 0;
	let skipped = 0;

	for (const post of posts) {
		const { rows: existing } = await client.execute({
			sql: 'select id from checkin where id = ? limit 1',
			args: [post.id]
		});
		if (existing.length > 0) {
			skipped++;
			continue;
		}

		await client.execute({
			sql: `insert into checkin
				(id, title, slug, author_id, latitude, longitude, location_place, location_country, location_name, created_at)
				values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
				post.id,
				post.title,
				post.slug,
				post.author_id,
				post.latitude,
				post.longitude,
				post.location_place,
				post.location_country,
				post.location_name,
				post.created_at
			]
		});

		const { rows: blocks } = await client.execute({
			sql: 'select id, position, type, text from post_block where post_id = ?',
			args: [post.id]
		});
		for (const block of blocks) {
			await client.execute({
				sql: 'insert into checkin_block (id, checkin_id, position, type, text) values (?, ?, ?, ?, ?)',
				args: [block.id, post.id, block.position, block.type, block.text]
			});
		}

		const { rows: photos } = await client.execute({
			sql: `select id, filename, original_name, width, height, block_id, exclude_from_stream, position, created_at
				from photo where post_id = ?`,
			args: [post.id]
		});
		for (const photo of photos) {
			await client.execute({
				sql: `insert into checkin_photo
					(id, filename, original_name, width, height, checkin_id, block_id, exclude_from_stream, position, created_at)
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				args: [
					photo.id,
					photo.filename,
					photo.original_name,
					photo.width,
					photo.height,
					post.id,
					photo.block_id,
					photo.exclude_from_stream,
					photo.position,
					photo.created_at
				]
			});
		}

		// Verify before touching the old rows: counts must match exactly.
		const { rows: blockCountRows } = await client.execute({
			sql: 'select count(*) as n from checkin_block where checkin_id = ?',
			args: [post.id]
		});
		const { rows: photoCountRows } = await client.execute({
			sql: 'select count(*) as n from checkin_photo where checkin_id = ?',
			args: [post.id]
		});

		if (Number(blockCountRows[0].n) !== blocks.length || Number(photoCountRows[0].n) !== photos.length) {
			throw new Error(`Row count mismatch after migrating checkin ${post.id} — aborting before delete`);
		}

		await client.execute({ sql: 'delete from post_tag where post_id = ?', args: [post.id] });
		await client.execute({ sql: 'delete from photo where post_id = ?', args: [post.id] });
		await client.execute({ sql: 'delete from post_block where post_id = ?', args: [post.id] });
		await client.execute({ sql: 'delete from post where id = ?', args: [post.id] });

		migrated++;
	}

	console.log(`Migration done: ${migrated} checkin(s) moved, ${skipped} already migrated.`);
}

await main();
process.exit(0);
