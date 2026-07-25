import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { photo, activityPhoto, checkinPhoto, albumPhoto, post } from '$lib/server/db/schema';
import { and, asc, desc, isNull, or, eq, gt, lt } from 'drizzle-orm';
import { deleteUploadedPhoto } from '$lib/server/storage';
import { deletePostCascade, isPostNowEmpty } from '$lib/server/posts';
import { pruneEmptyPhotoBlocks } from '$lib/server/blocks';
import { pruneEmptyCheckinPhotoBlocks } from '$lib/server/checkinBlocks';
import { finishPage, PAGE_SIZE, readPageCursor } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url }) => {
	const cursor = readPageCursor(url);
	const ascending = cursor?.direction === 'after';
	const postCursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(photo.createdAt, cursor.date), and(eq(photo.createdAt, cursor.date), lt(photo.id, cursor.id)))
			: or(gt(photo.createdAt, cursor.date), and(eq(photo.createdAt, cursor.date), gt(photo.id, cursor.id)))
		: undefined;
	const activityCursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(activityPhoto.createdAt, cursor.date), and(eq(activityPhoto.createdAt, cursor.date), lt(activityPhoto.id, cursor.id)))
			: or(gt(activityPhoto.createdAt, cursor.date), and(eq(activityPhoto.createdAt, cursor.date), gt(activityPhoto.id, cursor.id)))
		: undefined;
	const checkinCursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(checkinPhoto.createdAt, cursor.date), and(eq(checkinPhoto.createdAt, cursor.date), lt(checkinPhoto.id, cursor.id)))
			: or(gt(checkinPhoto.createdAt, cursor.date), and(eq(checkinPhoto.createdAt, cursor.date), gt(checkinPhoto.id, cursor.id)))
		: undefined;
	const albumCursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(albumPhoto.createdAt, cursor.date), and(eq(albumPhoto.createdAt, cursor.date), lt(albumPhoto.id, cursor.id)))
			: or(gt(albumPhoto.createdAt, cursor.date), and(eq(albumPhoto.createdAt, cursor.date), gt(albumPhoto.id, cursor.id)))
		: undefined;
	// excludeFromStream is nullable with no default (see schema.ts) — NULL means "not excluded",
	// same as false. Never filter with a plain eq(excludeFromStream, false), it would drop NULLs too.
	const postPhotos = await db.query.photo.findMany({
		where: and(
			or(isNull(photo.excludeFromStream), eq(photo.excludeFromStream, false)),
			postCursorWhere
		),
		orderBy: ascending
			? [asc(photo.createdAt), asc(photo.id)]
			: [desc(photo.createdAt), desc(photo.id)],
		limit: PAGE_SIZE + 1,
		with: {
			post: { columns: { id: true, slug: true, title: true } }
		}
	});
	const activityPhotos = await db.query.activityPhoto.findMany({
		where: activityCursorWhere,
		orderBy: ascending
			? [asc(activityPhoto.createdAt), asc(activityPhoto.id)]
			: [desc(activityPhoto.createdAt), desc(activityPhoto.id)],
		limit: PAGE_SIZE + 1,
		with: { activity: { columns: { id: true, slug: true, title: true } } }
	});
	const checkinPhotos = await db.query.checkinPhoto.findMany({
		where: checkinCursorWhere,
		orderBy: ascending
			? [asc(checkinPhoto.createdAt), asc(checkinPhoto.id)]
			: [desc(checkinPhoto.createdAt), desc(checkinPhoto.id)],
		limit: PAGE_SIZE + 1,
		with: { checkin: { columns: { id: true, slug: true, title: true, locationName: true } } }
	});
	const albumPhotos = await db.query.albumPhoto.findMany({
		where: albumCursorWhere,
		orderBy: ascending
			? [asc(albumPhoto.createdAt), asc(albumPhoto.id)]
			: [desc(albumPhoto.createdAt), desc(albumPhoto.id)],
		limit: PAGE_SIZE + 1,
		with: { album: { columns: { id: true, slug: true, title: true } } }
	});

	const photos = [
		...postPhotos.map((photo) => ({
			...photo,
			sortDate: photo.createdAt,
			kind: 'post' as const,
			origins: photo.post
				? [{ label: 'Beitrag', title: photo.post.title || 'Beitrag', href: `/posts/${photo.post.slug ?? photo.post.id}` }]
				: []
		})),
		...activityPhotos.map((photo) => ({
			...photo,
			sortDate: photo.createdAt,
			kind: 'activity' as const,
			postId: null,
			blockId: null,
			excludeFromStream: null,
			origins: photo.activity
				? [{ label: 'Aktivität', title: photo.activity.title, href: `/activities/${photo.activity.slug ?? photo.activity.id}` }]
				: []
		})),
		...checkinPhotos.map((photo) => ({
			...photo,
			sortDate: photo.createdAt,
			kind: 'checkin' as const,
			postId: null,
			blockId: null,
			excludeFromStream: null,
			origins: photo.checkin
				? [
						{
							label: 'Checkin',
							title: photo.checkin.title || photo.checkin.locationName || 'Checkin',
							href: `/checkins/${photo.checkin.slug ?? photo.checkin.id}`
						}
					]
				: []
		})),
		...albumPhotos.map((photo) => ({
			...photo,
			sortDate: photo.createdAt,
			kind: 'album' as const,
			postId: null,
			blockId: null,
			excludeFromStream: null,
			origins: photo.album
				? [{ label: 'Album', title: photo.album.title, href: `/albums/${photo.album.slug ?? photo.album.id}` }]
				: []
		}))
	].sort((a, b) => {
		const dateDifference = ascending
			? a.createdAt.getTime() - b.createdAt.getTime()
			: b.createdAt.getTime() - a.createdAt.getTime();
		if (dateDifference !== 0) return dateDifference;
		return ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
	});

	const page = finishPage(photos, cursor?.direction ?? null);
	return { photos: page.items, pagination: page.pagination };
};

export const actions: Actions = {
	deletePhoto: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const data = await request.formData();
		const photoId = String(data.get('photoId') ?? '');

		const found = await db.query.photo.findFirst({ where: eq(photo.id, photoId) });
		if (found) {
			await deleteUploadedPhoto(found.filename);
			await db.delete(photo).where(eq(photo.id, found.id));
			await pruneEmptyPhotoBlocks(found.postId);

			const owner = await db.query.post.findFirst({
				where: eq(post.id, found.postId),
				with: { blocks: { with: { photos: true } } }
			});

			if (owner && isPostNowEmpty(owner, owner.blocks)) {
				await deletePostCascade({ id: owner.id, photos: [] });
			}
			return;
		}

		const foundActivityPhoto = await db.query.activityPhoto.findFirst({
			where: eq(activityPhoto.id, photoId)
		});
		if (foundActivityPhoto) {
			await deleteUploadedPhoto(foundActivityPhoto.filename);
			await db.delete(activityPhoto).where(eq(activityPhoto.id, foundActivityPhoto.id));
			return;
		}

		const foundCheckinPhoto = await db.query.checkinPhoto.findFirst({
			where: eq(checkinPhoto.id, photoId)
		});
		if (foundCheckinPhoto) {
			await deleteUploadedPhoto(foundCheckinPhoto.filename);
			await db.delete(checkinPhoto).where(eq(checkinPhoto.id, foundCheckinPhoto.id));
			await pruneEmptyCheckinPhotoBlocks(foundCheckinPhoto.checkinId);
			return;
		}

		const foundAlbumPhoto = await db.query.albumPhoto.findFirst({
			where: eq(albumPhoto.id, photoId)
		});
		if (foundAlbumPhoto) {
			await deleteUploadedPhoto(foundAlbumPhoto.filename);
			await db.delete(albumPhoto).where(eq(albumPhoto.id, foundAlbumPhoto.id));
			return;
		}

		throw error(404, 'Foto nicht gefunden');
	}
};
