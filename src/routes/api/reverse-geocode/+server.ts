import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CONTACT_EMAIL } from '$lib/consts';

const USER_AGENT = `achis.blog (+mailto:${CONTACT_EMAIL})`;

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

	const nominatimUrl =
		`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}` +
		`&zoom=18&addressdetails=1`;

	let res: Response;
	try {
		res = await fetch(nominatimUrl, { headers: { 'User-Agent': USER_AGENT } });
	} catch {
		return json({ error: 'Nominatim ist nicht erreichbar.' }, { status: 502 });
	}
	if (!res.ok) {
		return json({ error: `Nominatim-Fehler (${res.status}).` }, { status: 502 });
	}

	const data = await res.json();
	const address = data.address ?? {};
	// OSM addressing represents "the settlement" at different admin levels depending on locale/
	// mapping detail — city (large places), town, village (rural) cover the realistic cases.
	const place: string | null = address.city ?? address.town ?? address.village ?? null;
	const country: string | null = address.country ?? null;
	// `name` is only present when the point resolves to a named feature (park, landmark,
	// building) rather than a plain address — exactly the POI-suggestion signal we want.
	const poiName: string | null =
		typeof data.name === 'string' && data.name.trim() ? data.name.trim() : null;

	return json({ place, country, poiName });
};
