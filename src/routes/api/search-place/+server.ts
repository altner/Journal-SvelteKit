import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchPlaces } from '$lib/server/geocode';

export const GET: RequestHandler = async ({ url, locals, fetch }) => {
	// Auth-gated for the same reason as reverse-geocode: a live proxy to a rate-limited
	// third-party service (Nominatim's public instance allows ~1 req/s) that only the operator's
	// own composer/editor UI ever needs.
	if (!locals.user) return json({ error: 'Nicht angemeldet.' }, { status: 401 });

	const query = (url.searchParams.get('q') ?? '').trim();
	if (!query) {
		return json({ error: 'Suchbegriff fehlt.' }, { status: 400 });
	}

	try {
		const results = await searchPlaces(query, fetch);
		return json(results);
	} catch {
		return json({ error: 'Nominatim ist nicht erreichbar.' }, { status: 502 });
	}
};
