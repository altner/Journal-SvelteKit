import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { post } from '$lib/server/db/schema';
import { deletePostCascade, findPostBySlugOrId } from '$lib/server/posts';
import { setPostTags, parseTagsField } from '$lib/server/tags';
import { parseBlocksMeta, reconcileEditedPostBlocks, blocksMetaHasContent } from '$lib/server/blocks';
import { buildPostExcerpt, pickPostOgImage } from '$lib/server/seo';

export const load: PageServerLoad = async ({ params, url }) => {
	const resolved = await findPostBySlugOrId(params.slug);
	if (!resolved) throw error(404, 'Beitrag nicht gefunden');
	if (resolved.matchedBy === 'id' && resolved.post.slug) {
		throw redirect(301, `/posts/${encodeURIComponent(resolved.post.slug)}`);
	}

	const found = await db.query.post.findFirst({
		where: eq(post.id, resolved.post.id),
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

	if (!found) throw error(404, 'Beitrag nicht gefunden');

	const ogImageFilename = pickPostOgImage(found);

	return {
		post: { ...found, tags: found.tags.map((pt) => pt.tag) },
		description: buildPostExcerpt(found.blocks),
		canonicalUrl: `${url.origin}/posts/${found.slug}`,
		ogImage: ogImageFilename ? `${url.origin}/uploads/${ogImageFilename}` : null
	};
};

export const actions: Actions = {
	delete: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const resolved = await findPostBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Beitrag nicht gefunden');

		const found = await db.query.post.findFirst({
			where: eq(post.id, resolved.post.id),
			with: { photos: true, album: true }
		});
		if (!found) throw error(404, 'Beitrag nicht gefunden');

		await deletePostCascade(found);
	},

	edit: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const resolved = await findPostBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Beitrag nicht gefunden');

		const found = await db.query.post.findFirst({
			where: eq(post.id, resolved.post.id),
			with: { blocks: { with: { photos: true } } }
		});
		if (!found) throw error(404, 'Beitrag nicht gefunden');

		if (found.isStatusPost) {
			return fail(403, { error: 'Automatische Album-Beiträge können nicht bearbeitet werden.' });
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
