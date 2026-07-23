import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { checkin } from '$lib/server/db/schema';
import { finishPage, PAGE_SIZE, readPageCursor } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url }) => {
	const cursor = readPageCursor(url);
	const cursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(checkin.createdAt, cursor.date), and(eq(checkin.createdAt, cursor.date), lt(checkin.id, cursor.id)))
			: or(gt(checkin.createdAt, cursor.date), and(eq(checkin.createdAt, cursor.date), gt(checkin.id, cursor.id)))
		: undefined;
	const checkins = await db.query.checkin.findMany({
		where: cursorWhere,
		orderBy: cursor?.direction === 'after'
			? [asc(checkin.createdAt), asc(checkin.id)]
			: [desc(checkin.createdAt), desc(checkin.id)],
		limit: PAGE_SIZE + 1,
		with: {
			blocks: {
				orderBy: (block, { asc }) => asc(block.position),
				with: { photos: { orderBy: (photo, { asc }) => asc(photo.position) } }
			}
		}
	});

	const page = finishPage(
		checkins.map((c) => ({ ...c, sortDate: c.createdAt })),
		cursor?.direction ?? null
	);
	return { posts: page.items, pagination: page.pagination };
};
