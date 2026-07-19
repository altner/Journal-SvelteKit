import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import { album } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const albums = await db.query.album.findMany({
		orderBy: desc(album.createdAt),
		with: { photos: { orderBy: (photo, { asc }) => asc(photo.position), limit: 1 } }
	});

	return { albums };
};
