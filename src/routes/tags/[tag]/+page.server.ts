import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq, inArray } from 'drizzle-orm';
import { post, tag, postTag, activity, activityTag } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const foundTag = await db.query.tag.findFirst({ where: eq(tag.slug, params.tag) });
	if (!foundTag) throw error(404, 'Tag nicht gefunden');

	const postLinks = await db.query.postTag.findMany({ where: eq(postTag.tagId, foundTag.id) });
	const postIds = postLinks.map((l) => l.postId);

	const posts = postIds.length
		? await db.query.post.findMany({
				where: inArray(post.id, postIds),
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
			})
		: [];

	const activityLinks = await db.query.activityTag.findMany({
		where: eq(activityTag.tagId, foundTag.id)
	});
	const activityIds = activityLinks.map((l) => l.activityId);

	const activities = activityIds.length
		? await db.query.activity.findMany({
				where: inArray(activity.id, activityIds),
				with: {
					tags: { with: { tag: true } },
					photos: { orderBy: (photo, { asc }) => asc(photo.position) }
				}
			})
		: [];

	// Same merge-by-"when did this happen" approach as the main feed (/routes/+page.server.ts) —
	// a tag page is really just the main feed filtered down to one tag, so it should read the
	// same way: one chronological stream, not posts-then-activities in two separate blocks.
	type TagItem =
		| { kind: 'post'; sortDate: Date; post: (typeof posts)[number] }
		| { kind: 'activity'; sortDate: Date; activity: (typeof activities)[number] };

	const merged: TagItem[] = [
		...posts.map((p): TagItem => ({ kind: 'post', sortDate: p.createdAt, post: p })),
		...activities.map((a): TagItem => ({ kind: 'activity', sortDate: a.startedAt, activity: a }))
	].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

	const items = merged.map((item) =>
		item.kind === 'post'
			? { kind: 'post' as const, post: { ...item.post, tags: item.post.tags.map((pt) => pt.tag) } }
			: {
					kind: 'activity' as const,
					activity: {
						...item.activity,
						tags: item.activity.tags.map((at) => at.tag),
						trackPoints: JSON.parse(item.activity.trackPoints) as [number, number][]
					}
				}
	);

	return { tag: foundTag, items };
};
