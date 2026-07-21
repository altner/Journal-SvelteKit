import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { asc, count } from 'drizzle-orm';
import { tag, postTag, activityTag } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	// Two separate grouped queries rather than one query joining both postTag and activityTag —
	// joining both to `tag` in a single query would fan out (a tag with both post and activity
	// links would multiply rows), corrupting the counts. Merging two clean per-source counts in
	// application code avoids that.
	const postCounts = await db
		.select({ tagId: postTag.tagId, n: count(postTag.id) })
		.from(postTag)
		.groupBy(postTag.tagId);

	const activityCounts = await db
		.select({ tagId: activityTag.tagId, n: count(activityTag.id) })
		.from(activityTag)
		.groupBy(activityTag.tagId);

	const countByTagId = new Map<string, number>();
	for (const { tagId, n } of postCounts) countByTagId.set(tagId, (countByTagId.get(tagId) ?? 0) + n);
	for (const { tagId, n } of activityCounts)
		countByTagId.set(tagId, (countByTagId.get(tagId) ?? 0) + n);

	const allTags = await db.query.tag.findMany({ orderBy: asc(tag.slug) });
	const tags = allTags
		.map((t) => ({ id: t.id, name: t.name, slug: t.slug, count: countByTagId.get(t.id) ?? 0 }))
		.filter((t) => t.count > 0);

	return { tags };
};
