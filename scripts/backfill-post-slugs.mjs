// One-time, idempotent migration: generates a `slug` for every existing post that doesn't have
// one yet (posts created before the slug column existed).
// Usage: node --env-file=.env scripts/backfill-post-slugs.mjs
import { createClient } from '@libsql/client';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/backfill-post-slugs.mjs');
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
	const { rows: posts } = await client.execute(
		'select id, title, slug from post order by created_at asc'
	);

	const usedSlugs = new Set(posts.map((p) => p.slug).filter(Boolean));

	let updated = 0;
	let skipped = 0;

	for (const p of posts) {
		if (p.slug) {
			skipped++;
			continue;
		}

		const base = slugify(p.title ?? '') || p.id;
		let candidate = base;
		let n = 2;
		while (usedSlugs.has(candidate)) {
			candidate = `${base}-${n++}`;
		}
		usedSlugs.add(candidate);

		await client.execute({ sql: 'update post set slug = ? where id = ?', args: [candidate, p.id] });
		updated++;
	}

	console.log(`Backfill done: ${updated} post(s) got a slug, ${skipped} already had one.`);
}

await main();
process.exit(0);
