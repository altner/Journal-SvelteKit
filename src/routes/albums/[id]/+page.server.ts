import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { album, photo, post } from '$lib/server/db/schema';
import { saveUploadedPhoto } from '$lib/server/storage';

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
	}
};
