import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { album, albumPhoto } from '$lib/server/db/schema';
import { deleteUploadedPhoto } from '$lib/server/storage';
import { findAlbumBySlugOrId, addPhotosToAlbum } from '$lib/server/albums';

export const load: PageServerLoad = async ({ params, url }) => {
	const resolved = await findAlbumBySlugOrId(params.slug);
	if (!resolved) throw error(404, 'Album nicht gefunden');
	if (resolved.matchedBy === 'id' && resolved.album.slug) {
		throw redirect(301, `/albums/${encodeURIComponent(resolved.album.slug)}`);
	}

	const found = await db.query.album.findFirst({
		where: eq(album.id, resolved.album.id),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) }
		}
	});

	if (!found) throw error(404, 'Album nicht gefunden');

	return {
		album: found,
		canonicalUrl: `${url.origin}/albums/${found.slug}`,
		ogImage: found.photos[0] ? `${url.origin}/uploads/${found.photos[0].filename}` : null
	};
};

export const actions: Actions = {
	addPhotos: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const resolved = await findAlbumBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Album nicht gefunden');

		const data = await request.formData();
		const files = data
			.getAll('photos')
			.filter((f): f is File => f instanceof File && f.size > 0);

		if (files.length === 0) {
			return fail(400, { error: 'Bitte füge mindestens ein Foto hinzu.' });
		}

		await addPhotosToAlbum(resolved.album.id, files, new Date());
	},

	deletePhoto: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const resolved = await findAlbumBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Album nicht gefunden');

		const data = await request.formData();
		const photoId = String(data.get('photoId') ?? '');

		const found = await db.query.albumPhoto.findFirst({ where: eq(albumPhoto.id, photoId) });
		if (!found || found.albumId !== resolved.album.id) {
			throw error(404, 'Foto nicht gefunden');
		}

		await deleteUploadedPhoto(found.filename);
		await db.delete(albumPhoto).where(eq(albumPhoto.id, found.id));
	},

	deleteAlbum: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const resolved = await findAlbumBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Album nicht gefunden');

		const found = await db.query.album.findFirst({
			where: eq(album.id, resolved.album.id),
			with: { photos: true }
		});
		if (!found) throw error(404, 'Album nicht gefunden');

		for (const p of found.photos) {
			await deleteUploadedPhoto(p.filename);
		}
		await db.delete(albumPhoto).where(eq(albumPhoto.albumId, found.id));
		await db.delete(album).where(eq(album.id, found.id));

		redirect(303, '/albums');
	}
};
