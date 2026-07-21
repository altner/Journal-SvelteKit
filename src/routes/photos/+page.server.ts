import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { photo, album, post } from '$lib/server/db/schema';
import { desc, isNull, or, eq, inArray } from 'drizzle-orm';
import { deleteUploadedPhoto } from '$lib/server/storage';
import { deletePostCascade, isPostNowEmpty } from '$lib/server/posts';
import { pruneEmptyPhotoBlocks } from '$lib/server/blocks';
import { generateAlbumSlug } from '$lib/server/albums';
import { randomUUID } from 'node:crypto';

export const load: PageServerLoad = async () => {
	// excludeFromStream is nullable with no default (see schema.ts) — NULL means "not excluded",
	// same as false. Never filter with a plain eq(excludeFromStream, false), it would drop NULLs too.
	const photos = await db
		.select()
		.from(photo)
		.where(or(isNull(photo.excludeFromStream), eq(photo.excludeFromStream, false)))
		.orderBy(desc(photo.createdAt));

	return { photos };
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
		if (!found) throw error(404, 'Foto nicht gefunden');

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
