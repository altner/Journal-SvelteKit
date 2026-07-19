import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { photo } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const photos = await db.select().from(photo).orderBy(desc(photo.createdAt));

	return { photos };
};
