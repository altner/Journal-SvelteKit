// One-time, idempotent backfill for justified gallery aspect ratios.
// Usage: npm run backfill-photo-dimensions
import { createClient } from '@libsql/client';
import sharp from 'sharp';
import path from 'node:path';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const client = createClient({ url: process.env.DATABASE_URL });
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');

async function backfillTable(table) {
	const { rows } = await client.execute(
		`select id, filename from ${table} where width is null or height is null`
	);
	let updated = 0;
	for (const row of rows) {
		const metadata = await sharp(path.join(uploadDir, String(row.filename))).metadata();
		if (!metadata.width || !metadata.height) continue;
		await client.execute({
			sql: `update ${table} set width = ?, height = ? where id = ?`,
			args: [metadata.width, metadata.height, row.id]
		});
		updated++;
	}
	return updated;
}

const postPhotos = await backfillTable('photo');
const activityPhotos = await backfillTable('activity_photo');
console.log(`Backfill done: ${postPhotos} post photo(s), ${activityPhotos} activity photo(s).`);
