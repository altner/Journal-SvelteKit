// One-time, idempotent migration: generates a `slug` for every existing album that doesn't have
// one yet (albums created before the slug column existed).
// Usage: node --env-file=.env scripts/backfill-album-slugs.mjs
import { createClient } from '@libsql/client';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/backfill-album-slugs.mjs');
	process.exit(1);
}

const client = createClient({ url: process.env.DATABASE_URL });

// Kept in sync with src/lib/server/slug.ts's slugify().
function slugify(input) {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

async function main() {
	const { rows: albums } = await client.execute(
		'select id, title, slug from album order by created_at asc'
	);

	const usedSlugs = new Set(albums.map((a) => a.slug).filter(Boolean));

	let updated = 0;
	let skipped = 0;

	for (const a of albums) {
		if (a.slug) {
			skipped++;
			continue;
		}

		const base = slugify(a.title ?? '') || a.id;
		let candidate = base;
		let n = 2;
		while (usedSlugs.has(candidate)) {
			candidate = `${base}-${n++}`;
		}
		usedSlugs.add(candidate);

		await client.execute({ sql: 'update album set slug = ? where id = ?', args: [candidate, a.id] });
		updated++;
	}

	console.log(`Backfill done: ${updated} album(s) got a slug, ${skipped} already had one.`);
}

await main();
process.exit(0);
