import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import { post } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const posts = await db.query.post.findMany({
		orderBy: desc(post.createdAt),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) },
			album: {
				with: {
					photos: { orderBy: (photo, { asc }) => asc(photo.position) }
				}
			}
		}
	});

	return { posts };
};
