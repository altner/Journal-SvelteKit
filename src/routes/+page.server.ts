import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { post, activity, checkin, albumPhoto } from '$lib/server/db/schema';
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

	// Albums have no carrier post — an "album" feed event is derived straight from album_photo,
	// not queried as its own entity. A batch of album_photo rows inserted in the same request all
	// share the exact same `createdAt` (one JS Date instance passed to every insert, see
	// lib/server/albums.ts), so grouping by (albumId, createdAt.getTime()) reliably recovers each
	// distinct "album created" / "N photos added" moment without a fake post to hang it off of.
	// No cursor/limit pushed into this query (unlike the other three) — a personal-blog-scale
	// album_photo table is small enough to group in JS; see tasks/todo.md for the reasoning.
	const albumPhotosWithAlbum = await db.query.albumPhoto.findMany({
		orderBy: asc(albumPhoto.createdAt),
		with: { album: { columns: { id: true, slug: true, title: true, description: true, createdAt: true } } }
	});

	type AlbumEvent = {
		kind: 'album';
		id: string;
		sortDate: Date;
		isNew: boolean;
		album: { id: string; slug: string | null; title: string; description: string | null };
		photos: { id: string; filename: string; originalName: string | null; width: number | null; height: number | null }[];
	};

	const albumEventsByKey = new Map<string, AlbumEvent>();
	for (const p of albumPhotosWithAlbum) {
		if (!p.album) continue; // FKs aren't enforced at runtime (see CLAUDE.md) — guard defensively
		const key = `${p.albumId}:${p.createdAt.getTime()}`;
		let evt = albumEventsByKey.get(key);
		if (!evt) {
			evt = {
				kind: 'album',
				id: key,
				sortDate: p.createdAt,
				isNew: p.createdAt.getTime() === p.album.createdAt.getTime(),
				album: {
					id: p.album.id,
					slug: p.album.slug,
					title: p.album.title,
					description: p.album.description
				},
				photos: []
			};
			albumEventsByKey.set(key, evt);
		}
		evt.photos.push({
			id: p.id,
			filename: p.filename,
			originalName: p.originalName,
			width: p.width,
			height: p.height
		});
	}
	const albumEvents = [...albumEventsByKey.values()].filter((e) =>
		cursor
			? cursor.direction === 'before'
				? e.sortDate.getTime() < cursor.date.getTime() ||
					(e.sortDate.getTime() === cursor.date.getTime() && e.id < cursor.id)
				: e.sortDate.getTime() > cursor.date.getTime() ||
					(e.sortDate.getTime() === cursor.date.getTime() && e.id > cursor.id)
			: true
	);

	// Posts, activities, checkins and album events are independent sources — merge them into one
	// chronological stream (sorted by the "when did this happen" timestamp) so the feed reads as a
	// single unified timeline, matching how the site's clustering/timeline sidebar already expects
	// one linear, pre-sorted sequence.
	type FeedItem =
		| { kind: 'post'; id: string; sortDate: Date; post: (typeof posts)[number] }
		| { kind: 'activity'; id: string; sortDate: Date; activity: (typeof activities)[number] }
		| { kind: 'checkin'; id: string; sortDate: Date; checkin: (typeof checkins)[number] }
		| AlbumEvent;

	const merged: FeedItem[] = [
		...posts.map((p): FeedItem => ({ kind: 'post', id: p.id, sortDate: p.createdAt, post: p })),
		...activities.map(
			(a): FeedItem => ({ kind: 'activity', id: a.id, sortDate: a.startedAt, activity: a })
		),
		...checkins.map(
			(c): FeedItem => ({ kind: 'checkin', id: c.id, sortDate: c.createdAt, checkin: c })
		),
		...albumEvents
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
		if (item.kind === 'album') {
			return {
				kind: 'album' as const,
				album: {
					...item.album,
					// The album's own id (used for hrefs) is not unique per feed item — one album can
					// produce a "created" event and one or more later "photos added" events, all
					// sharing that same album id. eventKey (the synthetic albumId:createdAt key from
					// above) is what's actually unique per feed item — use it for Svelte keys/anchors.
					eventKey: item.id,
					isNew: item.isNew,
					photos: item.photos,
					sortDate: item.sortDate,
					anchorId
				}
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
