import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { checkin } from '$lib/server/db/schema';
import { generateCheckinSlug } from '$lib/server/checkins';
import { saveNewCheckinBlocks } from '$lib/server/checkinBlocks';
import { resolveCreatedAt } from '$lib/server/datetime';
import { parseBlocksMeta } from '$lib/server/blocks';
import { randomUUID } from 'node:crypto';

// Ohne diese load-Funktion macht SvelteKit bei einer Client-Side-Navigation zu dieser Route
// keinen Server-Request, wenn es nichts zu laden gibt — der hooks.server.ts-Auth-Check greift
// dann nie und das Formular rendert ungeschützt im Browser (siehe posts/new/+page.server.ts).
export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	}
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) throw redirect(303, '/login');

		const data = await request.formData();
		const createdAt = resolveCreatedAt(
			String(data.get('date') ?? '').trim(),
			String(data.get('time') ?? '').trim()
		);
		const blocksMeta = parseBlocksMeta(data.get('blocksMeta'));

		const latitudeRaw = Number(data.get('latitude'));
		const longitudeRaw = Number(data.get('longitude'));
		const hasLocation =
			Number.isFinite(latitudeRaw) &&
			Number.isFinite(longitudeRaw) &&
			String(data.get('latitude') ?? '').trim() !== '';
		const locationPlace = String(data.get('locationPlace') ?? '').trim();
		const locationCountry = String(data.get('locationCountry') ?? '').trim();
		const locationName = String(data.get('locationName') ?? '').trim();
		const road = String(data.get('road') ?? '').trim();
		const houseNumber = String(data.get('houseNumber') ?? '').trim();
		const postcode = String(data.get('postcode') ?? '').trim();

		// Unlike a normal post, a checkin without a location doesn't make sense — the whole point
		// of a checkin is "where I am/was".
		if (!hasLocation) {
			return fail(400, { error: 'Bitte wähle einen Standort.' });
		}

		// The POI name isn't just decorative here — it's the only thing that makes the auto-title
		// and slug (below) actually descriptive instead of falling back to a generic "Eingecheckt".
		if (!locationName) {
			return fail(400, { error: 'Bitte gib einen Ortsnamen ein.' });
		}

		// Composed here instead of left null so it's actually persisted (tab title, etc.), not just
		// computed at render time — see checkinTitle() in CheckinCard.svelte for the same pattern.
		const title = `Eingecheckt: ${locationName}`;

		const id = randomUUID();
		const slug = await generateCheckinSlug(title, id);

		await db.insert(checkin).values({
			id,
			slug,
			title,
			authorId: user.id,
			createdAt,
			latitude: latitudeRaw,
			longitude: longitudeRaw,
			locationPlace: locationPlace || null,
			locationCountry: locationCountry || null,
			locationName: locationName || null,
			road: road || null,
			houseNumber: houseNumber || null,
			postcode: postcode || null
		});

		await saveNewCheckinBlocks(id, blocksMeta, data);

		throw redirect(303, '/checkins');
	}
};
