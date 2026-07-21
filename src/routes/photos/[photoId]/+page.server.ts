import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { photo, post } from '$lib/server/db/schema';
import { desc, isNull, or, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, url }) => {
	// Same order+filter as /photos, so prev/next matches what the grid shows.
	const photos = await db
		.select()
		.from(photo)
		.where(or(isNull(photo.excludeFromStream), eq(photo.excludeFromStream, false)))
		.orderBy(desc(photo.createdAt));

	const index = photos.findIndex((p) => p.id === params.photoId);
	if (index === -1) throw error(404, 'Foto nicht gefunden');

	const found = photos[index];
	const owner = await db.query.post.findFirst({
		where: eq(post.id, found.postId),
		columns: { title: true }
	});

	return {
		photos,
		index,
		ogTitle: owner?.title || 'Foto',
		canonicalUrl: `${url.origin}/photos/${found.id}`,
		ogImage: `${url.origin}/uploads/${found.filename}`
	};
};
