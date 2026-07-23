import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reverseGeocode } from '$lib/server/geocode';

export const GET: RequestHandler = async ({ url, locals, fetch }) => {
	// Auth-gated for the same reason addPhotos/delete/edit actions are: this endpoint is a live
	// proxy to a rate-limited third-party service (Nominatim's public instance allows ~1 req/s)
	// that only the operator's own composer/editor UI ever needs. Left open, any visitor could
	// hammer Nominatim through this server and get the app's IP rate-limited or blocked.
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
		const { place, country, poiName, road, houseNumber, postcode } = await reverseGeocode(lat, lon, fetch);
		return json({ place, country, poiName, road, houseNumber, postcode });
	} catch {
		return json({ error: 'Nominatim ist nicht erreichbar.' }, { status: 502 });
	}
};
