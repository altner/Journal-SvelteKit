import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { post } from '$lib/server/db/schema';
import { finishPage, PAGE_SIZE, readPageCursor } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url }) => {
	const cursor = readPageCursor(url);
	const cursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(post.createdAt, cursor.date), and(eq(post.createdAt, cursor.date), lt(post.id, cursor.id)))
			: or(gt(post.createdAt, cursor.date), and(eq(post.createdAt, cursor.date), gt(post.id, cursor.id)))
		: undefined;
	const posts = await db.query.post.findMany({
		where: cursorWhere,
		orderBy: cursor?.direction === 'after'
			? [asc(post.createdAt), asc(post.id)]
			: [desc(post.createdAt), desc(post.id)],
		limit: PAGE_SIZE + 1,
		with: {
			blocks: {
				orderBy: (block, { asc }) => asc(block.position),
				with: { photos: { orderBy: (photo, { asc }) => asc(photo.position) } }
			},
			tags: { with: { tag: true } }
		}
	});

	const page = finishPage(
		posts.map((p) => ({ ...p, sortDate: p.createdAt, tags: p.tags.map((pt) => pt.tag) })),
		cursor?.direction ?? null
	);
	return { posts: page.items, pagination: page.pagination };
};
