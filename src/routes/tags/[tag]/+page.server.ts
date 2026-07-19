import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { desc, eq, inArray } from 'drizzle-orm';
import { post, tag, postTag } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const foundTag = await db.query.tag.findFirst({ where: eq(tag.slug, params.tag) });
	if (!foundTag) throw error(404, 'Tag nicht gefunden');

	const links = await db.query.postTag.findMany({ where: eq(postTag.tagId, foundTag.id) });
	const postIds = links.map((l) => l.postId);

	if (postIds.length === 0) {
		return { tag: foundTag, posts: [] };
	}

	const posts = await db.query.post.findMany({
		where: inArray(post.id, postIds),
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

	const postsWithTags = posts.map((p) => ({ ...p, tags: p.tags.map((pt) => pt.tag) }));

	return { tag: foundTag, posts: postsWithTags };
};
