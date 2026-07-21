import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { activity } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { findActivityBySlugOrId } from '$lib/server/activities';
import { formatActivitySummary } from '$lib/activityFormat';

export const load: PageServerLoad = async ({ params, url }) => {
	const resolved = await findActivityBySlugOrId(params.slug);
	if (!resolved) throw error(404, 'Aktivität nicht gefunden');
	if (resolved.matchedBy === 'id' && resolved.activity.slug) {
		throw redirect(
			301,
			`/activities/${encodeURIComponent(resolved.activity.slug)}/photo/${params.photoId}`
		);
	}

	const found = await db.query.activity.findFirst({
		where: eq(activity.id, resolved.activity.id),
		with: { photos: { orderBy: (photo, { asc }) => asc(photo.position) } }
	});
	if (!found) throw error(404, 'Aktivität nicht gefunden');

	const index = found.photos.findIndex((photo) => photo.id === params.photoId);
	if (index === -1) throw error(404, 'Foto nicht gefunden');
	const photo = found.photos[index];

	return {
		activity: found,
		index,
		description: formatActivitySummary(found),
		canonicalUrl: `${url.origin}/activities/${found.slug}/photo/${photo.id}`,
		ogImage: `${url.origin}/uploads/${photo.filename}`
	};
};
