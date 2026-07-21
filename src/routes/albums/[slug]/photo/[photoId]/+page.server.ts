import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { album } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const found = await db.query.album.findFirst({
		where: eq(album.id, params.id),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) }
		}
	});

	if (!found) throw error(404, 'Album nicht gefunden');

	const index = found.photos.findIndex((p) => p.id === params.photoId);
	if (index === -1) throw error(404, 'Foto nicht gefunden');

	return { album: found, index };
};
