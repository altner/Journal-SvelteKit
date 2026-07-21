import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { photo, activityPhoto, album, post } from '$lib/server/db/schema';
import { and, asc, desc, isNull, or, eq, gt, inArray, lt } from 'drizzle-orm';
import { deleteUploadedPhoto } from '$lib/server/storage';
import { deletePostCascade, isPostNowEmpty } from '$lib/server/posts';
import { pruneEmptyPhotoBlocks } from '$lib/server/blocks';
import { generateAlbumSlug } from '$lib/server/albums';
import { randomUUID } from 'node:crypto';
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
			post: { columns: { id: true, slug: true, title: true } },
			album: { columns: { id: true, slug: true, title: true } }
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

	const photos = [
		...postPhotos.map((photo) => ({
			...photo,
			sortDate: photo.createdAt,
			kind: 'post' as const,
			origins: [
				...(photo.album
					? [{ label: 'Album', title: photo.album.title, href: `/albums/${photo.album.slug ?? photo.album.id}` }]
					: []),
				...(photo.post
					? [{ label: 'Beitrag', title: photo.post.title || 'Beitrag', href: `/posts/${photo.post.slug ?? photo.post.id}` }]
					: [])
			]
		})),
		...activityPhotos.map((photo) => ({
			...photo,
			sortDate: photo.createdAt,
			kind: 'activity' as const,
			postId: null,
			albumId: null,
			blockId: null,
			excludeFromStream: null,
			origins: photo.activity
				? [{ label: 'Aktivität', title: photo.activity.title, href: `/activities/${photo.activity.slug ?? photo.activity.id}` }]
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
	createAlbumFromSelection: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const data = await request.formData();
		const albumTitle = String(data.get('albumTitle') ?? '').trim();
		const photoIds = data.getAll('photoIds').map(String).filter(Boolean);

		if (photoIds.length < 2) {
			return fail(400, { error: 'Bitte wähle mindestens zwei Fotos aus.' });
		}

		// Gegenprüfung gegen eine evtl. veraltete Client-Auswahl - nur wirklich noch lose Fotos
		// (kein albumId) dürfen ins neue Album übernommen werden, kein Umhängen aus einem
		// bestehenden Album.
		const candidates = await db
			.select({ id: photo.id, albumId: photo.albumId })
			.from(photo)
			.where(inArray(photo.id, photoIds));
		const looseIds = candidates.filter((p) => p.albumId == null).map((p) => p.id);

		if (looseIds.length < 2) {
			return fail(400, { error: 'Bitte wähle mindestens zwei lose Fotos aus.' });
		}

		const albumTitleFinal = albumTitle || 'Neues Album';
		const albumId = randomUUID();
		const albumSlug = await generateAlbumSlug(albumTitleFinal, albumId);

		const [createdAlbum] = await db
			.insert(album)
			.values({
				id: albumId,
				slug: albumSlug,
				title: albumTitleFinal,
				originPostId: null,
				authorId: user.id,
				createdAt: new Date()
			})
			.returning();

		await db.update(photo).set({ albumId: createdAlbum.id }).where(inArray(photo.id, looseIds));

		throw redirect(303, `/albums/${encodeURIComponent(createdAlbum.slug ?? createdAlbum.id)}`);
	},

	deletePhoto: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const data = await request.formData();
		const photoId = String(data.get('photoId') ?? '');

		const found = await db.query.photo.findFirst({ where: eq(photo.id, photoId) });
		if (!found) {
			const foundActivityPhoto = await db.query.activityPhoto.findFirst({
				where: eq(activityPhoto.id, photoId)
			});
			if (!foundActivityPhoto) throw error(404, 'Foto nicht gefunden');
			await deleteUploadedPhoto(foundActivityPhoto.filename);
			await db.delete(activityPhoto).where(eq(activityPhoto.id, foundActivityPhoto.id));
			return;
		}

		await deleteUploadedPhoto(found.filename);
		await db.delete(photo).where(eq(photo.id, found.id));
		await pruneEmptyPhotoBlocks(found.postId);

		const owner = await db.query.post.findFirst({
			where: eq(post.id, found.postId),
			with: { blocks: { with: { photos: true } }, album: true }
		});

		if (owner && isPostNowEmpty(owner, owner.blocks)) {
			await deletePostCascade({ id: owner.id, photos: [], album: owner.album });
		}
	}
};
