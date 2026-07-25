import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { checkin } from '$lib/server/db/schema';
import { generateCheckinSlug } from '$lib/server/checkins';
import { saveNewCheckinBlocks } from '$lib/server/checkinBlocks';
import type { BlockMeta } from '$lib/server/blocks';
import { reverseGeocode } from '$lib/server/geocode';
import { authorizeIndieAuthCheckinRequest } from '$lib/server/indieAuthCheckinAuth';

// Standard Micropub JSON syntax (https://micropub.spec.indieweb.org/#json-syntax), the shape
// osm-checkin sends: an h-entry whose `checkin` property is itself an h-card with name/lat/lon.
interface MicropubJsonEntry {
	type?: string[];
	properties?: {
		checkin?: [
			{ properties?: { name?: string[]; latitude?: string[]; longitude?: string[]; url?: string[] } }
		];
		content?: string[];
	};
}

export const POST: RequestHandler = async ({ request, url, fetch }) => {
	const owner = await authorizeIndieAuthCheckinRequest(request, fetch);

	let body: MicropubJsonEntry;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Expected a JSON body');
	}

	if (!body.type?.includes('h-entry')) {
		throw error(400, 'Expected type: ["h-entry"]');
	}

	const checkinCard = body.properties?.checkin?.[0];
	const locationName = String(checkinCard?.properties?.name?.[0] ?? '').trim();
	const locationUrl = String(checkinCard?.properties?.url?.[0] ?? '').trim();
	const latitudeRaw = checkinCard?.properties?.latitude?.[0];
	const longitudeRaw = checkinCard?.properties?.longitude?.[0];
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
		throw error(400, 'properties.checkin[0].properties.latitude/longitude are required');
	}

	const content = String(body.properties?.content?.[0] ?? '').trim();

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
		locationUrl: locationUrl || null,
		locationPlace,
		locationCountry,
		road,
		houseNumber,
		postcode
	});

	// v1 over IndieAuth has no photo support (osm-checkin sends JSON, not a file upload — see the
	// indie-auth integration plan) — just the text block, no photos block at all.
	const blocksMeta: BlockMeta[] = [];
	if (content) blocksMeta.push({ id: randomUUID(), type: 'text', text: content });
	if (blocksMeta.length > 0) await saveNewCheckinBlocks(id, blocksMeta, new FormData());

	return new Response(null, { status: 201, headers: { Location: `${url.origin}/checkins/${slug}` } });
};
