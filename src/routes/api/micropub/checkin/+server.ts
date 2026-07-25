import { error, json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { checkin } from '$lib/server/db/schema';
import { generateCheckinSlug } from '$lib/server/checkins';
import { saveNewCheckinBlocks, saveAlreadyUploadedCheckinPhotos } from '$lib/server/checkinBlocks';
import type { BlockMeta } from '$lib/server/blocks';
import { reverseGeocode } from '$lib/server/geocode';
import { readUploadedPhotoDimensions } from '$lib/server/storage';
import { authorizeIndieAuthCheckinRequest, verifyIndieAuthCreateScope } from '$lib/server/indieAuthCheckinAuth';

// Standard Micropub JSON syntax (https://micropub.spec.indieweb.org/#json-syntax), the shape
// osm-checkin sends: an h-entry whose `checkin` property is itself an h-card with name/lat/lon.
// `photo` is a Micropub media-endpoint reference (see routes/api/micropub/media) — a URL string
// (or {value, alt} object per spec; osm-checkin sends bare strings) pointing at a file this same
// server already saved via the media endpoint, not a fresh upload in this request.
interface MicropubJsonEntry {
	type?: string[];
	properties?: {
		checkin?: [
			{ properties?: { name?: string[]; latitude?: string[]; longitude?: string[]; url?: string[] } }
		];
		content?: string[];
		photo?: (string | { value?: string })[];
	};
}

// GET ?q=config (https://micropub.spec.indieweb.org/#configuration) — how a client discovers the
// media endpoint. Authenticated the same as POST since it's the same trust boundary.
export const GET: RequestHandler = async ({ request, url, fetch }) => {
	const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
	if (!match || !(await verifyIndieAuthCreateScope(match[1], fetch))) {
		throw error(401, 'Unauthorized');
	}
	if (url.searchParams.get('q') !== 'config') throw error(400, 'Unsupported query');

	return json({ 'media-endpoint': `${url.origin}/api/micropub/media` });
};

/** Extracts the on-disk filename from a photo URL this server itself issued via the media
 *  endpoint (`{origin}/uploads/{filename}`) — anything else (a foreign URL, a malformed value) is
 *  ignored rather than fetched, since this endpoint only ever references its own previously-saved
 *  media, never downloads arbitrary third-party URLs. */
function extractOwnUploadFilename(photoUrl: string, origin: string): string | null {
	const prefix = `${origin}/uploads/`;
	if (!photoUrl.startsWith(prefix)) return null;
	const filename = photoUrl.slice(prefix.length);
	return filename.includes('/') ? null : filename;
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

	const blocksMeta: BlockMeta[] = [];
	if (content) blocksMeta.push({ id: randomUUID(), type: 'text', text: content });
	if (blocksMeta.length > 0) await saveNewCheckinBlocks(id, blocksMeta, new FormData());

	// Photos already saved via the media endpoint — resolve each reference to a filename we
	// actually have on disk (best-effort: a bogus/foreign URL or a file that's gone is skipped,
	// not a hard failure of the whole checkin).
	const photoUrls = (body.properties?.photo ?? [])
		.map((p) => (typeof p === 'string' ? p : p?.value))
		.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
	const photos: { filename: string; width: number; height: number }[] = [];
	for (const photoUrl of photoUrls) {
		const filename = extractOwnUploadFilename(photoUrl, url.origin);
		if (!filename) continue;
		const dimensions = await readUploadedPhotoDimensions(filename);
		if (!dimensions) continue;
		photos.push({ filename, width: dimensions.width, height: dimensions.height });
	}
	if (photos.length > 0) {
		await saveAlreadyUploadedCheckinPhotos(id, photos, { startBlockPosition: blocksMeta.length });
	}

	return new Response(null, { status: 201, headers: { Location: `${url.origin}/checkins/${slug}` } });
};
