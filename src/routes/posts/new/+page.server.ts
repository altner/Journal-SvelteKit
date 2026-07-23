import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { album, photo, post } from '$lib/server/db/schema';
import { setPostTags, parseTagsField } from '$lib/server/tags';
import { generatePostSlug } from '$lib/server/posts';
import { generateAlbumSlug } from '$lib/server/albums';
import { resolveCreatedAt } from '$lib/server/datetime';
import {
	parseBlocksMeta,
	saveNewPostBlocks,
	blocksMetaHasContent,
	countNonExcludedNewFiles
} from '$lib/server/blocks';
import { eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// Ohne diese load-Funktion macht SvelteKit bei einer Client-Side-Navigation zu dieser Route
// (z.B. per <a href="/posts/new">) keinen Server-Request, wenn es nichts zu laden gibt — der
// hooks.server.ts-Auth-Check greift dann nie und das Formular rendert ungeschützt im Browser.
export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(303, '/login');

		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const saveAsAlbum = data.get('saveAsAlbum') === 'on';
		const albumTitle = String(data.get('albumTitle') ?? '').trim();
		const albumDescription = String(data.get('albumDescription') ?? '').trim();
		const createdAt = resolveCreatedAt(
			String(data.get('date') ?? '').trim(),
			String(data.get('time') ?? '').trim()
		);
		const rawTags = parseTagsField(data.get('tags'));
		const blocksMeta = parseBlocksMeta(data.get('blocksMeta'));

		const latitudeRaw = Number(data.get('latitude'));
		const longitudeRaw = Number(data.get('longitude'));
		const hasLocation =
			Number.isFinite(latitudeRaw) &&
			Number.isFinite(longitudeRaw) &&
			String(data.get('latitude') ?? '').trim() !== '';
		const locationPlace = String(data.get('locationPlace') ?? '').trim();
		const locationCountry = String(data.get('locationCountry') ?? '').trim();
		const locationName = String(data.get('locationName') ?? '').trim();

		if (!blocksMetaHasContent(blocksMeta, data)) {
			return fail(400, { error: 'Bitte gib einen Text ein oder füge mindestens ein Foto hinzu.' });
		}

		if (saveAsAlbum && countNonExcludedNewFiles(blocksMeta, data) < 2) {
			return fail(400, {
				error: 'Ein Album braucht mindestens zwei Fotos. Lade weitere Fotos hoch oder deaktiviere die Album-Option.'
			});
		}

		const id = randomUUID();
		const slug = await generatePostSlug(title || null, id);

		const [createdPost] = await db
			.insert(post)
			.values({
				id,
				slug,
				title: title || null,
				authorId: user.id,
				createdAt,
				latitude: hasLocation ? latitudeRaw : null,
				longitude: hasLocation ? longitudeRaw : null,
				locationPlace: locationPlace || null,
				locationCountry: locationCountry || null,
				locationName: locationName || null
			})
			.returning();

		await setPostTags(createdPost.id, rawTags);

		const { nonExcludedPhotoIds } = await saveNewPostBlocks(createdPost.id, blocksMeta, data);

		if (saveAsAlbum && nonExcludedPhotoIds.length >= 2) {
			const albumTitleFinal = albumTitle || title || 'Neues Album';
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
		}

		throw redirect(303, '/');
	}
};
