import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import { post } from '$lib/server/db/schema';
import { clusterPostsByMonth } from '$lib/timeline';

export const load: PageServerLoad = async () => {
	const posts = await db.query.post.findMany({
		orderBy: desc(post.createdAt),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) },
			album: {
				with: {
					photos: { orderBy: (photo, { asc }) => asc(photo.position) }
				}
			},
			tags: { with: { tag: true } }
		}
	});

	const { groups, anchorIdByPostId } = clusterPostsByMonth(posts);
	const postsWithAnchors = posts.map((p) => ({
		...p,
		anchorId: anchorIdByPostId.get(p.id) ?? null,
		tags: p.tags.map((pt) => pt.tag)
	}));

	return { posts: postsWithAnchors, clusters: groups };
};
