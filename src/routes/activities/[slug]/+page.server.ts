import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { activity, activityPhoto, activityTag } from '$lib/server/db/schema';
import { findActivityBySlugOrId, normalizeSport, buildFallbackTitle } from '$lib/server/activities';
import { deleteUploadedPhoto, saveUploadedPhoto } from '$lib/server/storage';
import { formatActivitySummary } from '$lib/activityFormat';
import { setActivityTags, parseTagsField } from '$lib/server/tags';

export const load: PageServerLoad = async ({ params, url }) => {
	const resolved = await findActivityBySlugOrId(params.slug);
	if (!resolved) throw error(404, 'Aktivität nicht gefunden');
	if (resolved.matchedBy === 'id' && resolved.activity.slug) {
		throw redirect(301, `/activities/${encodeURIComponent(resolved.activity.slug)}`);
	}

	const found = await db.query.activity.findFirst({
		where: eq(activity.id, resolved.activity.id),
		with: {
			tags: { with: { tag: true } },
			photos: { orderBy: (photo, { asc }) => asc(photo.position) }
		}
	});
	if (!found) throw error(404, 'Aktivität nicht gefunden');

	return {
		activity: {
			...found,
			tags: found.tags.map((at) => at.tag),
			trackPoints: JSON.parse(found.trackPoints) as [number, number][]
		},
		canonicalUrl: `${url.origin}/activities/${found.slug}`,
		description: formatActivitySummary(found)
	};
};

export const actions: Actions = {
	delete: async ({ params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const resolved = await findActivityBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Aktivität nicht gefunden');

		const found = await db.query.activity.findFirst({
			where: eq(activity.id, resolved.activity.id),
			with: { photos: true }
		});
		if (!found) throw error(404, 'Aktivität nicht gefunden');

		// Foreign keys are not enabled at runtime, so rows and files must be removed explicitly.
		await Promise.all([
			deleteUploadedPhoto(found.filename),
			...found.photos.map((photo) => deleteUploadedPhoto(photo.filename))
		]);
		await db.delete(activityPhoto).where(eq(activityPhoto.activityId, found.id));
		await db.delete(activityTag).where(eq(activityTag.activityId, found.id));
		await db.delete(activity).where(eq(activity.id, found.id));
	},

	edit: async ({ request, params, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const resolved = await findActivityBySlugOrId(params.slug);
		if (!resolved) throw error(404, 'Aktivität nicht gefunden');

		const found = await db.query.activity.findFirst({
			where: eq(activity.id, resolved.activity.id),
			with: { photos: { orderBy: (photo, { desc }) => desc(photo.position) } }
		});
		if (!found) throw error(404, 'Aktivität nicht gefunden');

		const data = await request.formData();
		const sport = normalizeSport(String(data.get('sport') ?? ''));
		const titleInput = String(data.get('title') ?? '').trim();
		const title = titleInput || buildFallbackTitle(sport, found.startedAt);
		const rawTags = parseTagsField(data.get('tags'));
		const photoFiles = data
			.getAll('photos')
			.filter((value): value is File => value instanceof File && value.size > 0);
		const firstPosition = (found.photos[0]?.position ?? -1) + 1;
		const savedPhotos: {
			id: string;
			filename: string;
			originalName: string | null;
			width: number;
			height: number;
			position: number;
		}[] = [];

		try {
			for (const [offset, photoFile] of photoFiles.entries()) {
				const saved = await saveUploadedPhoto(photoFile);
				savedPhotos.push({
					id: crypto.randomUUID(),
					filename: saved.filename,
					originalName: photoFile.name || null,
					width: saved.width,
					height: saved.height,
					position: firstPosition + offset
				});
			}
			if (savedPhotos.length > 0) {
				await db.insert(activityPhoto).values(
					savedPhotos.map((photo) => ({ ...photo, activityId: found.id }))
				);
			}
		} catch (err) {
			await Promise.all(savedPhotos.map((photo) => deleteUploadedPhoto(photo.filename)));
			return fail(500, {
				error: err instanceof Error ? err.message : 'Fotos konnten nicht gespeichert werden.'
			});
		}

		// Slug is deliberately never touched here — it's immutable after creation, same rule as
		// post.slug/album.slug, so existing links to this activity keep working.
		await db.update(activity).set({ title, sport }).where(eq(activity.id, found.id));
		await setActivityTags(found.id, rawTags);
	}
};
