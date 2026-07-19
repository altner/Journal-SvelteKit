import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { env } from '$env/dynamic/private';

const UPLOAD_DIR = env.UPLOAD_DIR || path.resolve('uploads');

const MAX_WIDTH = 2000;
const WEBP_QUALITY = 80;

export async function ensureUploadDir() {
	await mkdir(UPLOAD_DIR, { recursive: true });
}

// Resizes + re-encodes as WebP in memory; the original upload is never written to disk.
export async function saveUploadedPhoto(file: File): Promise<{ filename: string }> {
	await ensureUploadDir();
	const filename = `${randomUUID()}.webp`;
	const original = Buffer.from(await file.arrayBuffer());
	const buffer = await sharp(original)
		.rotate() // bake in EXIF orientation before it gets stripped by re-encoding
		.resize({ width: MAX_WIDTH, withoutEnlargement: true })
		.webp({ quality: WEBP_QUALITY })
		.toBuffer();
	await writeFile(path.join(UPLOAD_DIR, filename), buffer);
	return { filename };
}

export function uploadFilePath(filename: string): string {
	// prevent path traversal
	const base = path.basename(filename);
	return path.join(UPLOAD_DIR, base);
}

export async function deleteUploadedPhoto(filename: string): Promise<void> {
	try {
		await unlink(uploadFilePath(filename));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
	}
}
