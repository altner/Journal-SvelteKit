import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, inArray, lt, or } from 'drizzle-orm';
import { album, photo, post } from '$lib/server/db/schema';
import { saveNewPostBlocks, type BlockMeta } from '$lib/server/blocks';
import { generateAlbumSlug } from '$lib/server/albums';
import { randomUUID } from 'node:crypto';
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

		const createdAt = new Date();

		const [createdPost] = await db
			.insert(post)
			.values({ title: albumTitle || null, authorId: user.id, createdAt })
			.returning();

		const blockId = randomUUID();
		const blocksMeta: BlockMeta[] = [
			{ id: blockId, type: 'photos', fileField: 'photos', excludeFromStream: false }
		];
		const { nonExcludedPhotoIds } = await saveNewPostBlocks(createdPost.id, blocksMeta, data);

		const albumTitleFinal = albumTitle || 'Neues Album';
		const albumId = randomUUID();
		const albumSlug = await generateAlbumSlug(albumTitleFinal, albumId);

		const [createdAlbum] = await db
			.insert(album)
			.values({
				id: albumId,
				slug: albumSlug,
				title: albumTitleFinal,
				description: albumDescription || null,
				originPostId: createdPost.id,
				authorId: user.id,
				createdAt
			})
			.returning();

		await db.update(post).set({ albumId: createdAlbum.id }).where(eq(post.id, createdPost.id));
		await db
			.update(photo)
			.set({ albumId: createdAlbum.id })
			.where(inArray(photo.id, nonExcludedPhotoIds));

		throw redirect(303, `/albums/${encodeURIComponent(createdAlbum.slug ?? createdAlbum.id)}`);
	}
};
