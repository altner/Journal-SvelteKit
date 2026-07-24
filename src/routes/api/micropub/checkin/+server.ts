import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { checkin } from '$lib/server/db/schema';
import { generateCheckinSlug } from '$lib/server/checkins';
import { saveNewCheckinBlocks } from '$lib/server/checkinBlocks';
import type { BlockMeta } from '$lib/server/blocks';
import { reverseGeocode } from '$lib/server/geocode';
import { authorizeMicropubRequest } from '$lib/server/micropubAuth';

export const POST: RequestHandler = async ({ request, url, fetch }) => {
	const data = await request.formData();
	const owner = await authorizeMicropubRequest(request, data);

	const locationName = String(data.get('checkin[name]') ?? '').trim();
	const latitudeRaw = data.get('checkin[latitude]');
	const longitudeRaw = data.get('checkin[longitude]');
	const latitude = typeof latitudeRaw === 'string' ? Number(latitudeRaw) : NaN;
	const longitude = typeof longitudeRaw === 'string' ? Number(longitudeRaw) : NaN;
	if (
		typeof latitudeRaw !== 'string' ||
		typeof longitudeRaw !== 'string' ||
		latitudeRaw.trim() === '' ||
		longitudeRaw.trim() === '' ||
		!Number.isFinite(latitude) ||
		!Number.isFinite(longitude)
	) {
		throw error(400, 'checkin[latitude] and checkin[longitude] are required');
	}

	const content = String(data.get('content') ?? '').trim();

	// Best-effort, like the activity weather backfill — a Nominatim hiccup shouldn't fail the
	// whole checkin, it just leaves the address fields unset (same as a post created before this
	// existed, or an API outage).
	let locationPlace: string | null = null;
	let locationCountry: string | null = null;
	let road: string | null = null;
	let houseNumber: string | null = null;
	let postcode: string | null = null;
	try {
		const geocoded = await reverseGeocode(latitude, longitude, fetch);
		locationPlace = geocoded.place;
		locationCountry = geocoded.country;
		road = geocoded.road;
		houseNumber = geocoded.houseNumber;
		postcode = geocoded.postcode;
	} catch {
		// leave address fields unset
	}

	const id = randomUUID();
	const slug = await generateCheckinSlug(null, id);

	await db.insert(checkin).values({
		id,
		slug,
		title: null,
		authorId: owner.id,
		latitude,
		longitude,
		locationName: locationName || null,
		locationPlace,
		locationCountry,
		road,
		houseNumber,
		postcode
	});

	// A checkin is just at most one text block and one photo block — same block-saving logic the
	// normal composer uses (routes/posts/new), just against checkin_block/checkin_photo.
	const blocksMeta: BlockMeta[] = [];
	if (content) blocksMeta.push({ id: randomUUID(), type: 'text', text: content });
	blocksMeta.push({ id: randomUUID(), type: 'photos', fileField: 'photo', excludeFromStream: false });
	await saveNewCheckinBlocks(id, blocksMeta, data);

	return new Response(null, { status: 201, headers: { Location: `${url.origin}/checkins/${slug}` } });
};
