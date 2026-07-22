import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, lt, or } from 'drizzle-orm';
import { activity, activityPhoto, activityTag } from '$lib/server/db/schema';
import { deleteUploadedPhoto, saveUploadedPhoto, saveUploadedTrackFile } from '$lib/server/storage';
import { parseGpxTrack } from '$lib/server/gpx';
import { fetchHistoricalWeather } from '$lib/server/weather';
import {
	generateActivitySlug,
	normalizeSport,
	buildFallbackTitle,
	downsampleTrack
} from '$lib/server/activities';
import { setActivityTags, parseTagsField } from '$lib/server/tags';
import { randomUUID } from 'node:crypto';
import { finishPage, PAGE_SIZE, readPageCursor } from '$lib/server/pagination';

export const load: PageServerLoad = async ({ url }) => {
	const cursor = readPageCursor(url);
	const cursorWhere = cursor
		? cursor.direction === 'before'
			? or(lt(activity.createdAt, cursor.date), and(eq(activity.createdAt, cursor.date), lt(activity.id, cursor.id)))
			: or(gt(activity.createdAt, cursor.date), and(eq(activity.createdAt, cursor.date), gt(activity.id, cursor.id)))
		: undefined;
	const activities = await db.query.activity.findMany({
		where: cursorWhere,
		orderBy: cursor?.direction === 'after'
			? [asc(activity.createdAt), asc(activity.id)]
			: [desc(activity.createdAt), desc(activity.id)],
		limit: PAGE_SIZE + 1,
		with: {
			tags: { with: { tag: true } },
			photos: { orderBy: (photo, { asc }) => asc(photo.position) }
		}
	});

	const page = finishPage(
		activities.map((a) => ({
			...a,
			sortDate: a.createdAt,
			tags: a.tags.map((at) => at.tag),
			trackPoints: JSON.parse(a.trackPoints) as [number, number][]
		})),
		cursor?.direction ?? null
	);
	return { activities: page.items, pagination: page.pagination };
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Bitte melde dich an.' });

		const data = await request.formData();
		const file = data.get('trackFile');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Bitte wähle eine GPX-Datei aus.' });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		let parsed;
		try {
			parsed = parseGpxTrack(buffer);
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'GPX-Datei konnte nicht gelesen werden.'
			});
		}

		if (parsed.durationSeconds == null || parsed.startedAt == null) {
			return fail(400, {
				error: 'Diese GPX-Datei enthält keine Zeitstempel — Dauer kann nicht berechnet werden.'
			});
		}

		const sportInput = String(data.get('sport') ?? '').trim();
		const sport = normalizeSport(sportInput || parsed.detectedSport);

		const titleInput = String(data.get('title') ?? '').trim();
		const title = titleInput || buildFallbackTitle(sport, parsed.startedAt);

		const id = randomUUID();
		const slug = await generateActivitySlug(title, id);
		const rawTags = parseTagsField(data.get('tags'));
		const photoFiles = data
			.getAll('photos')
			.filter((value): value is File => value instanceof File && value.size > 0);

		const savedFilenames: string[] = [];
		let filename: string;
		try {
			({ filename } = await saveUploadedTrackFile(file, ['.gpx']));
			savedFilenames.push(filename);

			await db.insert(activity).values({
				id,
				slug,
				title,
				sport,
				distanceMeters: parsed.distanceMeters,
				durationSeconds: parsed.durationSeconds,
				elevationGainMeters: parsed.elevationGainMeters,
				startedAt: parsed.startedAt,
				filename,
				originalName: file.name || null,
				trackPoints: JSON.stringify(downsampleTrack(parsed.points)),
				authorId: user.id
			});

			await setActivityTags(id, rawTags);
			for (const [position, photoFile] of photoFiles.entries()) {
				const saved = await saveUploadedPhoto(photoFile);
				savedFilenames.push(saved.filename);
				await db.insert(activityPhoto).values({
					activityId: id,
					filename: saved.filename,
					width: saved.width,
					height: saved.height,
					originalName: photoFile.name || null,
					position
				});
			}

			// Best-effort — Open-Meteo's archive has a ~5-day lag, so a freshly-uploaded activity
			// commonly gets no data yet (null return, not an error). Never let a weather API hiccup
			// fail the whole upload; scripts/backfill-weather.mjs re-fetches missing ones later.
			try {
				const [startLat, startLon] = parsed.points[0];
				const weather = await fetchHistoricalWeather(startLat, startLon, parsed.startedAt);
				if (weather) {
					await db
						.update(activity)
						.set({
							weatherTempC: weather.tempC,
							weatherCode: weather.code,
							weatherWindKph: weather.windKph,
							weatherPrecipitationMm: weather.precipitationMm
						})
						.where(eq(activity.id, id));
				}
			} catch {
				// ignored — see comment above
			}
		} catch (err) {
			await Promise.all(savedFilenames.map((saved) => deleteUploadedPhoto(saved)));
			await db.delete(activityPhoto).where(eq(activityPhoto.activityId, id));
			await db.delete(activityTag).where(eq(activityTag.activityId, id));
			await db.delete(activity).where(eq(activity.id, id));
			return fail(500, {
				error: err instanceof Error ? err.message : 'Aktivität konnte nicht gespeichert werden.'
			});
		}

		throw redirect(303, `/activities/${encodeURIComponent(slug)}`);
	}
};
