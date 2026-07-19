import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { photo } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	// Same order as /photos, so prev/next matches what the grid shows.
	const photos = await db.select().from(photo).orderBy(desc(photo.createdAt));

	const index = photos.findIndex((p) => p.id === params.photoId);
	if (index === -1) throw error(404, 'Foto nicht gefunden');

	return { photos, index };
};
