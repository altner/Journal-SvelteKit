import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { desc, eq, inArray } from 'drizzle-orm';
import { album, photo, post } from '$lib/server/db/schema';
import { saveNewPostBlocks, type BlockMeta } from '$lib/server/blocks';
import { randomUUID } from 'node:crypto';

export const load: PageServerLoad = async () => {
	const albums = await db.query.album.findMany({
		orderBy: desc(album.createdAt),
		with: { photos: { orderBy: (photo, { asc }) => asc(photo.position), limit: 1 } }
	});

	return { albums };
};

export const actions: Actions = {
	createAlbum: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const data = await request.formData();
		const albumTitle = String(data.get('albumTitle') ?? '').trim();
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

		const [createdAlbum] = await db
			.insert(album)
			.values({
				title: albumTitle || 'Neues Album',
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

		throw redirect(303, `/albums/${createdAlbum.id}`);
	}
};
