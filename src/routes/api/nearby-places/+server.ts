import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findNearbyPlaces } from '$lib/server/overpass';

const RADIUS_METERS = 100;

export const GET: RequestHandler = async ({ url, locals, fetch }) => {
	// Auth-gated for the same reason as reverse-geocode/search-place: a live proxy to a
	// rate-limited third-party service that only the operator's own composer/editor UI needs.
	if (!locals.user) return json({ error: 'Nicht angemeldet.' }, { status: 401 });

	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	if (
		!Number.isFinite(lat) ||
		!Number.isFinite(lon) ||
		lat < -90 ||
		lat > 90 ||
		lon < -180 ||
		lon > 180
	) {
		return json({ error: 'Ungültige Koordinaten.' }, { status: 400 });
	}

	try {
		const results = await findNearbyPlaces(lat, lon, RADIUS_METERS, fetch);
		return json(results);
	} catch {
		return json({ error: 'Overpass ist nicht erreichbar.' }, { status: 502 });
	}
};
