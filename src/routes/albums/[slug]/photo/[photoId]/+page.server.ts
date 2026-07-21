import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { album } from '$lib/server/db/schema';
import { findAlbumBySlugOrId } from '$lib/server/albums';

export const load: PageServerLoad = async ({ params, url }) => {
	const resolved = await findAlbumBySlugOrId(params.slug);
	if (!resolved) throw error(404, 'Album nicht gefunden');
	if (resolved.matchedBy === 'id' && resolved.album.slug) {
		throw redirect(301, `/albums/${encodeURIComponent(resolved.album.slug)}/photo/${params.photoId}`);
	}

	const found = await db.query.album.findFirst({
		where: eq(album.id, resolved.album.id),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) }
		}
	});

	if (!found) throw error(404, 'Album nicht gefunden');

	const index = found.photos.findIndex((p) => p.id === params.photoId);
	if (index === -1) throw error(404, 'Foto nicht gefunden');

	const photo = found.photos[index];

	return {
		album: found,
		index,
		canonicalUrl: `${url.origin}/albums/${found.slug}/photo/${photo.id}`,
		ogImage: `${url.origin}/uploads/${photo.filename}`
	};
};
