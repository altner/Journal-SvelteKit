import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { album, photo, post } from '$lib/server/db/schema';
import { saveUploadedPhoto, deleteUploadedPhoto } from '$lib/server/storage';
import { deletePostCascade, isPostNowEmpty } from '$lib/server/posts';

export const load: PageServerLoad = async ({ params }) => {
	const found = await db.query.album.findFirst({
		where: eq(album.id, params.id),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) }
		}
	});

	if (!found) throw error(404, 'Album nicht gefunden');

	return { album: found };
};

export const actions: Actions = {
	addPhotos: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const found = await db.query.album.findFirst({ where: eq(album.id, params.id) });
		if (!found) throw error(404, 'Album nicht gefunden');

		const data = await request.formData();
		const text = String(data.get('text') ?? '').trim();
		const files = data
			.getAll('photos')
			.filter((f): f is File => f instanceof File && f.size > 0);

		if (files.length === 0) {
			return fail(400, { error: 'Bitte füge mindestens ein Foto hinzu.' });
		}

		// Weiterzählen statt bei 0 neu anzufangen, damit die Reihenfolge stabil bleibt.
		const [lastPhoto] = await db
			.select({ position: photo.position })
			.from(photo)
			.where(eq(photo.albumId, found.id))
			.orderBy(desc(photo.position))
			.limit(1);
		let position = (lastPhoto?.position ?? -1) + 1;

		const title =
			files.length === 1
				? `Ein neues Foto zum Album "${found.title}" wurde hinzugefügt`
				: `Neue Fotos zum Album "${found.title}" wurden hinzugefügt`;

		const [createdPost] = await db
			.insert(post)
			.values({
				title,
				text: text || null,
				authorId: user.id,
				albumId: found.id,
				isStatusPost: true
			})
			.returning();

		for (const file of files) {
			const { filename } = await saveUploadedPhoto(file);
			await db.insert(photo).values({
				filename,
				originalName: file.name,
				postId: createdPost.id,
				albumId: found.id,
				position: position++
			});
		}
	},

	deletePhoto: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const data = await request.formData();
		const photoId = String(data.get('photoId') ?? '');

		const found = await db.query.photo.findFirst({ where: eq(photo.id, photoId) });
		if (!found || found.albumId !== params.id) {
			throw error(404, 'Foto nicht gefunden');
		}

		await deleteUploadedPhoto(found.filename);
		await db.delete(photo).where(eq(photo.id, found.id));

		const owner = await db.query.post.findFirst({
			where: eq(post.id, found.postId),
			with: { photos: true, album: true }
		});

		if (owner && isPostNowEmpty(owner, owner.photos.length)) {
			await deletePostCascade(owner);
		}
	},

	deleteAlbum: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const found = await db.query.album.findFirst({
			where: eq(album.id, params.id),
			with: { photos: true }
		});
		if (!found) throw error(404, 'Album nicht gefunden');

		const contributingPosts = await db.select().from(post).where(eq(post.albumId, found.id));

		for (const p of found.photos) {
			await deleteUploadedPhoto(p.filename);
		}
		await db.delete(photo).where(eq(photo.albumId, found.id));

		for (const p of contributingPosts) {
			if (p.isStatusPost) {
				await db.delete(post).where(eq(post.id, p.id));
			} else {
				await db.update(post).set({ albumId: null }).where(eq(post.id, p.id));
				if (!p.title && !p.text) {
					await db.delete(post).where(eq(post.id, p.id));
				}
			}
		}

		await db.delete(album).where(eq(album.id, found.id));
		redirect(303, '/albums');
	}
};
