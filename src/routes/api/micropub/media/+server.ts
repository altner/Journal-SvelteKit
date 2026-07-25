import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveUploadedPhoto } from '$lib/server/storage';
import { verifyIndieAuthCreateScope } from '$lib/server/indieAuthCheckinAuth';

// Micropub media endpoint (https://micropub.spec.indieweb.org/#media-endpoint) — clients that
// can't send multipart-with-photo in one request to the main endpoint (e.g. osm-checkin, which
// posts a JSON h-entry) upload the file here first, then reference the returned Location URL as
// `properties.photo` in the h-entry. IndieAuth-only (same as /api/micropub/checkin) — no static
// MICROPUB_TOKEN fallback, since only IndieAuth clients currently need this.
export const POST: RequestHandler = async ({ request, url, fetch }) => {
	const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
	if (!match) throw error(401, 'Unauthorized');

	const authorized = await verifyIndieAuthCreateScope(match[1], fetch);
	if (!authorized) throw error(401, 'Unauthorized');

	const data = await request.formData();
	const file = data.get('file');
	if (!(file instanceof File) || file.size === 0) throw error(400, 'file is required');

	const { filename } = await saveUploadedPhoto(file);

	return new Response(null, { status: 201, headers: { Location: `${url.origin}/uploads/${filename}` } });
};
