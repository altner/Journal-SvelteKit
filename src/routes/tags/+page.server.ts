import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { asc, count, eq, gt } from 'drizzle-orm';
import { tag, postTag } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const tags = await db
		.select({
			id: tag.id,
			name: tag.name,
			slug: tag.slug,
			postCount: count(postTag.id)
		})
		.from(tag)
		.leftJoin(postTag, eq(postTag.tagId, tag.id))
		.groupBy(tag.id)
		.having(({ postCount }) => gt(postCount, 0))
		.orderBy(asc(tag.slug));

	return { tags };
};
