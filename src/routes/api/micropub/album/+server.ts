import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAlbum } from '$lib/server/albums';
import { authorizeMicropubRequest } from '$lib/server/micropubAuth';

// Albums are fully independent of post/photo (own album_photo table, see schema.ts) — no carrier
// post involved. No `content` field: an album's only free text is its `description`.
export const POST: RequestHandler = async ({ request, url }) => {
	const data = await request.formData();
	const owner = await authorizeMicropubRequest(request, data);

	const title = String(data.get('title') ?? '').trim();
	if (!title) throw error(400, 'title is required');

	const description = String(data.get('description') ?? '').trim();

	const files = data.getAll('photo').filter((f): f is File => f instanceof File && f.size > 0);
	if (files.length < 2) throw error(400, 'at least 2 photos are required');

	const { albumSlug } = await createAlbum(
		{ title, description: description || null },
		files,
		owner.id,
		new Date()
	);

	return new Response(null, { status: 201, headers: { Location: `${url.origin}/albums/${albumSlug}` } });
};
