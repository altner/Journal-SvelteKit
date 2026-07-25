import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post } from '$lib/server/db/schema';
import { generatePostSlug } from '$lib/server/posts';
import { setPostTags, parseTagsField } from '$lib/server/tags';
import { saveNewPostBlocks, type BlockMeta } from '$lib/server/blocks';
import { reverseGeocode } from '$lib/server/geocode';
import { authorizeMicropubPostRequest } from '$lib/server/micropubAuth';

// Plain posts only — no album creation here, that's routes/api/micropub/album's own job. Keeping
// each endpoint's contract to exactly one entity type instead of an in-endpoint flag was a
// deliberate choice after the single-endpoint dispatch version turned out to be brittle in
// practice (see tasks/todo.md).
export const POST: RequestHandler = async ({ request, url, fetch }) => {
	const data = await request.formData();
	const owner = await authorizeMicropubPostRequest(request, data, fetch);

	const title = String(data.get('title') ?? '').trim();
	const content = String(data.get('content') ?? '').trim();
	if (!title || !content) throw error(400, 'title and content are required');

	const rawTags = parseTagsField(data.get('tags'));

	const latitudeRaw = data.get('latitude');
	const longitudeRaw = data.get('longitude');
	const latitude = typeof latitudeRaw === 'string' ? Number(latitudeRaw) : NaN;
	const longitude = typeof longitudeRaw === 'string' ? Number(longitudeRaw) : NaN;
	const hasLocation =
		typeof latitudeRaw === 'string' &&
		typeof longitudeRaw === 'string' &&
		latitudeRaw.trim() !== '' &&
		longitudeRaw.trim() !== '' &&
		Number.isFinite(latitude) &&
		Number.isFinite(longitude);
	const locationName = String(data.get('locationName') ?? '').trim();

	// Best-effort, same pattern as the checkin endpoint — a Nominatim hiccup shouldn't fail the
	// whole post, it just leaves place/country unset.
	let locationPlace: string | null = null;
	let locationCountry: string | null = null;
	if (hasLocation) {
		try {
			const geocoded = await reverseGeocode(latitude, longitude, fetch);
			locationPlace = geocoded.place;
			locationCountry = geocoded.country;
		} catch {
			// leave place/country unset
		}
	}

	const id = randomUUID();
	const slug = await generatePostSlug(title, id);

	await db.insert(post).values({
		id,
		slug,
		title,
		authorId: owner.id,
		createdAt: new Date(),
		latitude: hasLocation ? latitude : null,
		longitude: hasLocation ? longitude : null,
		locationPlace,
		locationCountry,
		locationName: locationName || null
	});

	await setPostTags(id, rawTags);

	const blocksMeta: BlockMeta[] = [
		{ id: randomUUID(), type: 'text', text: content },
		{ id: randomUUID(), type: 'photos', fileField: 'photo', excludeFromStream: false }
	];
	await saveNewPostBlocks(id, blocksMeta, data);

	return new Response(null, { status: 201, headers: { Location: `${url.origin}/posts/${slug}` } });
};
