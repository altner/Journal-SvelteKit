import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { post, photo, album } from '$lib/server/db/schema';
import { deleteUploadedPhoto } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params }) => {
	const found = await db.query.post.findFirst({
		where: eq(post.id, params.id),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) },
			album: {
				with: {
					photos: { orderBy: (photo, { asc }) => asc(photo.position) }
				}
			}
		}
	});

	if (!found) throw error(404, 'Post nicht gefunden');

	return { post: found };
};

export const actions: Actions = {
	delete: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const found = await db.query.post.findFirst({
			where: eq(post.id, params.id),
			with: { photos: true, album: true }
		});
		if (!found) throw error(404, 'Post nicht gefunden');

		// Album selbst bleibt bestehen — nur den Rückverweis lösen, falls dieser Post ihn begründet hat
		if (found.album && found.album.originPostId === found.id) {
			await db.update(album).set({ originPostId: null }).where(eq(album.id, found.album.id));
		}

		// Dateien von der Platte entfernen (kein FK-Cascade aktiv — SQLite erzwingt Foreign Keys nur
		// mit PRAGMA foreign_keys=ON, was dieses Projekt nirgends setzt).
		for (const p of found.photos) {
			await deleteUploadedPhoto(p.filename);
		}

		await db.delete(photo).where(eq(photo.postId, found.id));
		await db.delete(post).where(eq(post.id, found.id));
	},

	edit: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const found = await db.query.post.findFirst({
			where: eq(post.id, params.id),
			with: { photos: true }
		});
		if (!found) throw error(404, 'Post nicht gefunden');

		if (found.isStatusPost) {
			return fail(403, { error: 'Status-Posts können nicht bearbeitet werden.' });
		}

		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const text = String(data.get('text') ?? '').trim();

		if (!text && found.photos.length === 0) {
			return fail(400, { error: 'Bitte gib einen Text ein.' });
		}

		await db
			.update(post)
			.set({ title: title || null, text: text || null })
			.where(eq(post.id, found.id));
	}
};
