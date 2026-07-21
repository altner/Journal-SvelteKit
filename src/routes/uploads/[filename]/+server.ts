import { error } from '@sveltejs/kit';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';
import { uploadFilePath } from '$lib/server/storage';

const MIME_TYPES: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.gpx': 'application/gpx+xml'
};

export const GET: RequestHandler = async ({ params }) => {
	const filePath = uploadFilePath(params.filename);
	const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
	const mime = MIME_TYPES[ext] ?? 'application/octet-stream';

	try {
		const stats = await stat(filePath);
		const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
		return new Response(stream, {
			headers: {
				'Content-Type': mime,
				'Content-Length': String(stats.size),
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch {
		throw error(404, 'Photo not found');
	}
};
