import { CONTACT_EMAIL } from '$lib/consts';

const USER_AGENT = `achis.blog (+mailto:${CONTACT_EMAIL})`;

export type ReverseGeocodeResult = {
	place: string | null;
	country: string | null;
	poiName: string | null;
	road: string | null;
	houseNumber: string | null;
	postcode: string | null;
};

/** Reverse-geocodes coordinates via Nominatim's public instance (~1 req/s rate limit — callers
 *  must be gated, see routes/api/reverse-geocode's own auth check for why). Throws on network
 *  failure or a non-OK response; callers that treat this as best-effort enrichment (like the
 *  Micropub checkin endpoint) should catch and continue with place/country left unset. */
export async function reverseGeocode(
	lat: number,
	lon: number,
	fetchFn: typeof fetch = fetch
): Promise<ReverseGeocodeResult> {
	const nominatimUrl =
		`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}` +
		`&zoom=18&addressdetails=1`;

	const res = await fetchFn(nominatimUrl, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) throw new Error(`Nominatim-Fehler (${res.status}).`);

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
	const road: string | null = address.road ?? null;
	const houseNumber: string | null = address.house_number ?? null;
	const postcode: string | null = address.postcode ?? null;

	return { place, country, poiName, road, houseNumber, postcode };
}
