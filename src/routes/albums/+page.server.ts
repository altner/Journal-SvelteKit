import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { album } from '$lib/server/db/schema';
import { createAlbum } from '$lib/server/albums';
import { finishPage, PAGE_SIZE, readPageCursor } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url }) => {
	const cursor = readPageCursor(url);
	const cursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(album.createdAt, cursor.date), and(eq(album.createdAt, cursor.date), lt(album.id, cursor.id)))
			: or(gt(album.createdAt, cursor.date), and(eq(album.createdAt, cursor.date), gt(album.id, cursor.id)))
		: undefined;
	const albums = await db.query.album.findMany({
		where: cursorWhere,
		orderBy: cursor?.direction === 'after'
			? [asc(album.createdAt), asc(album.id)]
			: [desc(album.createdAt), desc(album.id)],
		limit: PAGE_SIZE + 1,
		with: { photos: { orderBy: (photo, { asc }) => asc(photo.position), limit: 1 } }
	});

	const page = finishPage(
		albums.map((a) => ({
			...a,
			sortDate: a.createdAt,
			width: a.photos[0]?.width ?? 4,
			height: a.photos[0]?.height ?? 3
		})),
		cursor?.direction ?? null
	);
	return { albums: page.items, pagination: page.pagination };
};

export const actions: Actions = {
	createAlbum: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const data = await request.formData();
		const albumTitle = String(data.get('albumTitle') ?? '').trim();
		const albumDescription = String(data.get('albumDescription') ?? '').trim();
		const files = data
			.getAll('photos')
			.filter((f): f is File => f instanceof File && f.size > 0);

		if (files.length < 2) {
			return fail(400, { error: 'Ein Album braucht mindestens zwei Fotos.' });
		}

		const { albumSlug } = await createAlbum(
			{ title: albumTitle || 'Neues Album', description: albumDescription || null },
			files,
			user.id,
			new Date()
		);

		throw redirect(303, `/albums/${encodeURIComponent(albumSlug)}`);
	}
};
