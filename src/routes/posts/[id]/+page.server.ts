import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { post } from '$lib/server/db/schema';
import { deletePostCascade } from '$lib/server/posts';
import { setPostTags, parseTagsField } from '$lib/server/tags';
import { parseBlocksMeta, reconcileEditedPostBlocks, blocksMetaHasContent } from '$lib/server/blocks';

export const load: PageServerLoad = async ({ params }) => {
	const found = await db.query.post.findFirst({
		where: eq(post.id, params.id),
		with: {
			blocks: {
				orderBy: (block, { asc }) => asc(block.position),
				with: { photos: { orderBy: (photo, { asc }) => asc(photo.position) } }
			},
			album: {
				with: {
					photos: { orderBy: (photo, { asc }) => asc(photo.position) }
				}
			},
			tags: { with: { tag: true } }
		}
	});

	if (!found) throw error(404, 'Post nicht gefunden');

	return { post: { ...found, tags: found.tags.map((pt) => pt.tag) } };
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

		await deletePostCascade(found);
	},

	edit: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const found = await db.query.post.findFirst({
			where: eq(post.id, params.id),
			with: { blocks: { with: { photos: true } } }
		});
		if (!found) throw error(404, 'Post nicht gefunden');

		if (found.isStatusPost) {
			return fail(403, { error: 'Status-Posts können nicht bearbeitet werden.' });
		}

		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
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

		const existingPhotoBlockIds = new Set(
			found.blocks.filter((b) => b.type === 'photos').map((b) => b.id)
		);

		if (!blocksMetaHasContent(blocksMeta, data, existingPhotoBlockIds)) {
			return fail(400, { error: 'Bitte gib einen Text ein.' });
		}

		await db
			.update(post)
			.set({
				title: title || null,
				latitude: hasLocation ? latitudeRaw : null,
				longitude: hasLocation ? longitudeRaw : null,
				locationPlace: locationPlace || null,
				locationCountry: locationCountry || null,
				locationName: locationName || null
			})
			.where(eq(post.id, found.id));

		await setPostTags(found.id, rawTags);
		await reconcileEditedPostBlocks(found.id, found.blocks, blocksMeta, data);
	}
};
