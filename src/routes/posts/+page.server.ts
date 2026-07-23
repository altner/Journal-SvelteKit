import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { post } from '$lib/server/db/schema';
import { finishPage, PAGE_SIZE, readPageCursor } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url }) => {
	const cursor = readPageCursor(url);
	const cursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(post.createdAt, cursor.date), and(eq(post.createdAt, cursor.date), lt(post.id, cursor.id)))
			: or(gt(post.createdAt, cursor.date), and(eq(post.createdAt, cursor.date), gt(post.id, cursor.id)))
		: undefined;
	// "Beiträge" is for standalone, user-authored posts — any post tied to an album (the origin
	// post that created it, or a later isStatusPost "photos added" post) lives under /albums/...
	// instead, so it's excluded here (but stays visible in the main Feed). Checkins have their own
	// table entirely now (see routes/checkins), so no filter is needed for them anymore.
	const beitragFilter = isNull(post.albumId);
	const posts = await db.query.post.findMany({
		where: cursorWhere ? and(beitragFilter, cursorWhere) : beitragFilter,
		orderBy: cursor?.direction === 'after'
			? [asc(post.createdAt), asc(post.id)]
			: [desc(post.createdAt), desc(post.id)],
		limit: PAGE_SIZE + 1,
		with: {
			blocks: {
				orderBy: (block, { asc }) => asc(block.position),
				with: { photos: { orderBy: (photo, { asc }) => asc(photo.position) } }
			},
			album: {
				with: {
					photos: { orderBy: (photo, { asc }) => asc(photo.position) }
				}
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
