import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';

const UPLOAD_DIR = env.UPLOAD_DIR || path.resolve('uploads');

export async function ensureUploadDir() {
	await mkdir(UPLOAD_DIR, { recursive: true });
}

function safeExtension(originalName: string): string {
	const ext = path.extname(originalName).toLowerCase();
	const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
	return allowed.includes(ext) ? ext : '';
}

/** Saves an uploaded File to disk and returns the generated filename. */
export async function saveUploadedPhoto(file: File): Promise<{ filename: string }> {
	await ensureUploadDir();
	const filename = `${randomUUID()}${safeExtension(file.name)}`;
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
