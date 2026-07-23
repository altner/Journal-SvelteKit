import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { checkin } from '$lib/server/db/schema';
import { deleteCheckinCascade, findCheckinBySlugOrId } from '$lib/server/checkins';
import { parseBlocksMeta } from '$lib/server/blocks';
import { reconcileEditedCheckinBlocks } from '$lib/server/checkinBlocks';
import { buildPostExcerpt, pickCheckinOgImage } from '$lib/server/seo';

/** `/checkins/[slug]` detail load. Unlike the old shared postDetail.ts, there's no cross-namespace
 *  redirect to worry about — checkins have always lived under /checkins/... on their own table
 *  now, so a lookup miss is just a 404. */
export const checkinDetailLoad = async ({ params, url }: { params: { slug: string }; url: URL }) => {
	const resolved = await findCheckinBySlugOrId(params.slug);
	if (!resolved) throw error(404, 'Checkin nicht gefunden');

	const found = await db.query.checkin.findFirst({
		where: eq(checkin.id, resolved.checkin.id),
		with: {
			blocks: {
				orderBy: (block, { asc }) => asc(block.position),
				with: { photos: { orderBy: (photo, { asc }) => asc(photo.position) } }
			}
		}
	});
	if (!found) throw error(404, 'Checkin nicht gefunden');

	if (resolved.matchedBy === 'id' && found.slug) {
		throw redirect(301, `/checkins/${encodeURIComponent(found.slug)}`);
	}

	const ogImageFilename = pickCheckinOgImage(found);

	return {
		post: found,
		description: buildPostExcerpt(found.blocks),
		canonicalUrl: `${url.origin}/checkins/${found.slug}`,
		ogImage: ogImageFilename ? `${url.origin}/uploads/${ogImageFilename}` : null
	};
};

/** `/checkins/[slug]/photo/[photoId]` standalone lightbox fallback load — mirrors
 *  postPhotoLoad in postDetail.ts. */
export const checkinPhotoLoad = async ({
	params,
	url
}: {
	params: { slug: string; photoId: string };
	url: URL;
}) => {
	const resolved = await findCheckinBySlugOrId(params.slug);
	if (!resolved) throw error(404, 'Checkin nicht gefunden');

	const found = await db.query.checkin.findFirst({
		where: eq(checkin.id, resolved.checkin.id),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) },
			blocks: { orderBy: (block, { asc }) => asc(block.position) }
		}
	});
	if (!found) throw error(404, 'Checkin nicht gefunden');

	if (resolved.matchedBy === 'id' && found.slug) {
		throw redirect(301, `/checkins/${encodeURIComponent(found.slug)}/photo/${params.photoId}`);
	}

	const index = found.photos.findIndex((p) => p.id === params.photoId);
	if (index === -1) throw error(404, 'Foto nicht gefunden');

	const photo = found.photos[index];

	return {
		post: found,
		index,
		description: buildPostExcerpt(found.blocks),
		canonicalUrl: `${url.origin}/checkins/${found.slug}/photo/${photo.id}`,
		ogImage: `${url.origin}/uploads/${photo.filename}`
	};
};

export const checkinDetailActions: Actions = {
	delete: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });
		if (!params.slug) throw error(404, 'Checkin nicht gefunden');

		const resolved = await findCheckinBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Checkin nicht gefunden');

		const found = await db.query.checkin.findFirst({
			where: eq(checkin.id, resolved.checkin.id),
			with: { photos: true }
		});
		if (!found) throw error(404, 'Checkin nicht gefunden');

		await deleteCheckinCascade(found);
	},

	edit: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });
		if (!params.slug) throw error(404, 'Checkin nicht gefunden');

		const resolved = await findCheckinBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Checkin nicht gefunden');

		const found = await db.query.checkin.findFirst({
			where: eq(checkin.id, resolved.checkin.id),
			with: { blocks: { with: { photos: true } } }
		});
		if (!found) throw error(404, 'Checkin nicht gefunden');

		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
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
		const road = String(data.get('road') ?? '').trim();
		const houseNumber = String(data.get('houseNumber') ?? '').trim();
		const postcode = String(data.get('postcode') ?? '').trim();

		await db
			.update(checkin)
			.set({
				title: title || null,
				latitude: hasLocation ? latitudeRaw : null,
				longitude: hasLocation ? longitudeRaw : null,
				locationPlace: locationPlace || null,
				locationCountry: locationCountry || null,
				locationName: locationName || null,
				road: road || null,
				houseNumber: houseNumber || null,
				postcode: postcode || null
			})
			.where(eq(checkin.id, found.id));

		await reconcileEditedCheckinBlocks(found.id, found.blocks, blocksMeta, data);
	}
};
