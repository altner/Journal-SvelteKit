import { error } from '@sveltejs/kit';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { post, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generatePostSlug } from '$lib/server/posts';
import { saveNewPostBlocks, type BlockMeta } from '$lib/server/blocks';
import { reverseGeocode } from '$lib/server/geocode';

// Own-Shortcut-only endpoint: authenticated with a single static bearer token from `.env`
// (MICROPUB_TOKEN), not IndieAuth — there is no third-party Micropub client involved. See
// CLAUDE.md / tasks/todo.md for why full IndieAuth was deliberately skipped.
function isAuthorized(request: Request): boolean {
	const expected = env.MICROPUB_TOKEN;
	if (!expected) return false;

	const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
	if (!match) return false;

	const provided = Buffer.from(match[1]);
	const expectedBuf = Buffer.from(expected);
	// timingSafeEqual throws on length mismatch instead of returning false, and requires
	// same-length buffers — compare lengths first.
	if (provided.length !== expectedBuf.length) return false;
	return timingSafeEqual(provided, expectedBuf);
}

export const POST: RequestHandler = async ({ request, url, fetch }) => {
	if (!isAuthorized(request)) throw error(401, 'Unauthorized');

	const ownerEmail = env.MICROPUB_USER_EMAIL;
	if (!ownerEmail) throw error(500, 'MICROPUB_USER_EMAIL is not configured');

	const owner = await db.query.user.findFirst({ where: eq(user.email, ownerEmail) });
	if (!owner) throw error(500, 'MICROPUB_USER_EMAIL does not match any user');

	const data = await request.formData();

	const h = String(data.get('h') ?? 'entry');
	if (h !== 'entry') throw error(400, 'Only h=entry is supported');

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
	// whole checkin, it just leaves place/country unset (same as a post created before this
	// existed, or an API outage).
	let locationPlace: string | null = null;
	let locationCountry: string | null = null;
	try {
		const geocoded = await reverseGeocode(latitude, longitude, fetch);
		// Checkins show the postcode (unlike normal posts' city-only locationPlace) since the
		// whole point is precisely where you checked in, not just the general area.
		locationPlace = [geocoded.postcode, geocoded.place].filter(Boolean).join(' ') || null;
		locationCountry = geocoded.country;
	} catch {
		// leave place/country unset
	}

	const id = randomUUID();
	const slug = await generatePostSlug(null, id);

	await db.insert(post).values({
		id,
		slug,
		title: null,
		authorId: owner.id,
		isCheckin: true,
		latitude,
		longitude,
		locationName: locationName || null,
		locationPlace,
		locationCountry
	});

	// Reuses the same block-saving logic the normal composer uses (routes/posts/new) instead of
	// duplicating photo-upload handling — a checkin is just a post with at most one text block and
	// one photo block.
	const blocksMeta: BlockMeta[] = [];
	if (content) blocksMeta.push({ id: randomUUID(), type: 'text', text: content });
	blocksMeta.push({ id: randomUUID(), type: 'photos', fileField: 'photo', excludeFromStream: false });
	await saveNewPostBlocks(id, blocksMeta, data);

	return new Response(null, { status: 201, headers: { Location: `${url.origin}/checkins/${slug}` } });
};
