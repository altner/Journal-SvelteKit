import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { post, activity, checkin } from '$lib/server/db/schema';
import { clusterPostsByMonth } from '$lib/timeline';
import { finishPage, PAGE_SIZE, readPageCursor } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url }) => {
	const cursor = readPageCursor(url);
	const postWhere = cursor
		? cursor.direction === 'before'
			? or(lt(post.createdAt, cursor.date), and(eq(post.createdAt, cursor.date), lt(post.id, cursor.id)))
			: or(gt(post.createdAt, cursor.date), and(eq(post.createdAt, cursor.date), gt(post.id, cursor.id)))
		: undefined;
	const activityWhere = cursor
		? cursor.direction === 'before'
			? or(lt(activity.startedAt, cursor.date), and(eq(activity.startedAt, cursor.date), lt(activity.id, cursor.id)))
			: or(gt(activity.startedAt, cursor.date), and(eq(activity.startedAt, cursor.date), gt(activity.id, cursor.id)))
		: undefined;
	const checkinWhere = cursor
		? cursor.direction === 'before'
			? or(lt(checkin.createdAt, cursor.date), and(eq(checkin.createdAt, cursor.date), lt(checkin.id, cursor.id)))
			: or(gt(checkin.createdAt, cursor.date), and(eq(checkin.createdAt, cursor.date), gt(checkin.id, cursor.id)))
		: undefined;
	const ascending = cursor?.direction === 'after';
	const posts = await db.query.post.findMany({
		where: postWhere,
		orderBy: ascending
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

	const activities = await db.query.activity.findMany({
		where: activityWhere,
		orderBy: ascending
			? [asc(activity.startedAt), asc(activity.id)]
			: [desc(activity.startedAt), desc(activity.id)],
		limit: PAGE_SIZE + 1,
		with: {
			tags: { with: { tag: true } },
			photos: { orderBy: (photo, { asc }) => asc(photo.position) }
		}
	});

	const checkins = await db.query.checkin.findMany({
		where: checkinWhere,
		orderBy: ascending
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

	// Posts, activities and checkins are three separate tables — merge them into one
	// chronological stream (sorted by the "when did this happen" timestamp: post.createdAt /
	// activity.startedAt / checkin.createdAt) so the feed reads as a single unified timeline,
	// matching how the site's clustering/timeline sidebar already expects one linear, pre-sorted
	// sequence.
	type FeedItem =
		| { kind: 'post'; id: string; sortDate: Date; post: (typeof posts)[number] }
		| { kind: 'activity'; id: string; sortDate: Date; activity: (typeof activities)[number] }
		| { kind: 'checkin'; id: string; sortDate: Date; checkin: (typeof checkins)[number] };

	const merged: FeedItem[] = [
		...posts.map((p): FeedItem => ({ kind: 'post', id: p.id, sortDate: p.createdAt, post: p })),
		...activities.map(
			(a): FeedItem => ({ kind: 'activity', id: a.id, sortDate: a.startedAt, activity: a })
		),
		...checkins.map(
			(c): FeedItem => ({ kind: 'checkin', id: c.id, sortDate: c.createdAt, checkin: c })
		)
	].sort((a, b) => {
		const dateDifference = ascending
			? a.sortDate.getTime() - b.sortDate.getTime()
			: b.sortDate.getTime() - a.sortDate.getTime();
		if (dateDifference !== 0) return dateDifference;
		return ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
	});

	const page = finishPage(merged, cursor?.direction ?? null);

	const { groups, anchorIdByPostId } = clusterPostsByMonth(
		page.items.map((item) => ({ id: item.id, createdAt: item.sortDate }))
	);

	const items = page.items.map((item) => {
		const anchorId = anchorIdByPostId.get(item.id) ?? null;
		if (item.kind === 'post') {
			return {
				kind: 'post' as const,
				post: { ...item.post, anchorId, tags: item.post.tags.map((pt) => pt.tag) }
			};
		}
		if (item.kind === 'checkin') {
			return {
				kind: 'checkin' as const,
				checkin: { ...item.checkin, anchorId }
			};
		}
		return {
			kind: 'activity' as const,
			activity: {
				...item.activity,
				anchorId,
				tags: item.activity.tags.map((at) => at.tag),
				trackPoints: JSON.parse(item.activity.trackPoints) as [number, number][]
			}
		};
	});

	return { items, clusters: groups, pagination: page.pagination };
};
