import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { photo, activityPhoto } from '$lib/server/db/schema';
import { desc, isNull, or, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, url }) => {
	// Same order+filter as /photos, so prev/next matches what the grid shows.
	const postPhotos = await db.query.photo.findMany({
		where: or(isNull(photo.excludeFromStream), eq(photo.excludeFromStream, false)),
		orderBy: desc(photo.createdAt),
		with: {
			post: { columns: { id: true, slug: true, title: true } },
			album: { columns: { id: true, slug: true, title: true } }
		}
	});
	const activityPhotos = await db.query.activityPhoto.findMany({
		orderBy: desc(activityPhoto.createdAt),
		with: { activity: { columns: { id: true, slug: true, title: true } } }
	});
	const photos = [
		...postPhotos.map((photo) => ({
			...photo,
			kind: 'post' as const,
			origins: [
				...(photo.album
					? [{ label: 'Album', title: photo.album.title, href: `/albums/${photo.album.slug ?? photo.album.id}` }]
					: []),
				...(photo.post
					? [{ label: 'Beitrag', title: photo.post.title || 'Beitrag', href: `/posts/${photo.post.slug ?? photo.post.id}` }]
					: [])
			]
		})),
		...activityPhotos.map((photo) => ({
			...photo,
			kind: 'activity' as const,
			postId: null,
			albumId: null,
			blockId: null,
			excludeFromStream: null,
			origins: photo.activity
				? [{ label: 'Aktivität', title: photo.activity.title, href: `/activities/${photo.activity.slug ?? photo.activity.id}` }]
				: []
		}))
	].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	const index = photos.findIndex((p) => p.id === params.photoId);
	if (index === -1) throw error(404, 'Foto nicht gefunden');

	const found = photos[index];
	return {
		photos,
		index,
		ogTitle: found.origins.at(-1)?.title || 'Foto',
		canonicalUrl: `${url.origin}/photos/${found.id}`,
		ogImage: `${url.origin}/uploads/${found.filename}`
	};
};
