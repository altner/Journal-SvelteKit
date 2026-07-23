import { CONTACT_EMAIL } from '$lib/consts';

const USER_AGENT = `achis.blog (+mailto:${CONTACT_EMAIL})`;
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export type NearbyPlace = {
	name: string;
	category: string | null; // amenity/shop/tourism/leisure/historic tag, e.g. "cafe"
	latitude: number;
	longitude: number;
};

/** Finds named OSM points within `radiusMeters` of a coordinate via the public Overpass API —
 *  used for the "what's here?" suggestion list after a map pin is set. Nominatim's `/reverse`
 *  (see geocode.ts) only ever returns a single nearest address/feature, not a list of nearby
 *  candidates, which is what Overpass's raw tag data is actually for. Throws on network failure
 *  or a non-OK response; callers should treat this as best-effort enrichment. */
export async function findNearbyPlaces(
	lat: number,
	lon: number,
	radiusMeters: number,
	fetchFn: typeof fetch = fetch
): Promise<NearbyPlace[]> {
	const query = `[out:json][timeout:10];(node(around:${radiusMeters},${lat},${lon})["name"];);out body 20;`;

	const res = await fetchFn(OVERPASS_URL, {
		method: 'POST',
		headers: {
			'User-Agent': USER_AGENT,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: `data=${encodeURIComponent(query)}`
	});
	if (!res.ok) throw new Error(`Overpass-Fehler (${res.status}).`);

	const data = await res.json();
	const elements = (data.elements ?? []) as any[];
	return elements
		.filter((el) => typeof el.tags?.name === 'string' && Number.isFinite(el.lat) && Number.isFinite(el.lon))
		.map((el) => ({
			name: el.tags.name,
			category:
				el.tags.amenity ?? el.tags.shop ?? el.tags.tourism ?? el.tags.leisure ?? el.tags.historic ?? null,
			latitude: el.lat,
			longitude: el.lon
		}));
}
