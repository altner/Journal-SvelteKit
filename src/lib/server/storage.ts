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
export async function saveUploadedPhoto(
	file: File
): Promise<{ filename: string; width: number; height: number }> {
	await ensureUploadDir();
	const filename = `${randomUUID()}.webp`;
	const original = Buffer.from(await file.arrayBuffer());
	const { data: buffer, info } = await sharp(original)
		.rotate() // bake in EXIF orientation before it gets stripped by re-encoding
		.resize({ width: MAX_WIDTH, withoutEnlargement: true })
		.webp({ quality: WEBP_QUALITY })
		.toBuffer({ resolveWithObject: true });
	await writeFile(path.join(UPLOAD_DIR, filename), buffer);
	return { filename, width: info.width, height: info.height };
}

// Raw file storage for non-image uploads (GPS tracks) — no transcoding, unlike saveUploadedPhoto.
// Takes the caller's allow-list of extensions (today just ['.gpx']) rather than hardcoding one.
export async function saveUploadedTrackFile(
	file: File,
	allowedExtensions: string[]
): Promise<{ filename: string }> {
	const ext = path.extname(file.name).toLowerCase();
	if (!allowedExtensions.includes(ext)) {
		throw new Error(`Nicht unterstütztes Dateiformat: ${ext || '(keine Endung)'}`);
	}
	await ensureUploadDir();
	const filename = `${randomUUID()}${ext}`;
	const buffer = Buffer.from(await file.arrayBuffer());
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
