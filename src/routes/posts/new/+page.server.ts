import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { album, photo, post } from '$lib/server/db/schema';
import { saveUploadedPhoto } from '$lib/server/storage';
import { setPostTags, parseTagsField } from '$lib/server/tags';
import { eq } from 'drizzle-orm';

// Nimmt die optionalen "date"/"time"-Felder (YYYY-MM-DD / HH:MM, z.B. für nachträglich
// hochgeladene ältere Fotos) und kombiniert sie. Ohne gültiges Datum: jetzt. Mit Datum aber ohne
// gültige Uhrzeit: aktuelle Uhrzeit (Fallback, wie zuvor), damit mehrere am selben Tag
// rückdatierte Posts trotzdem in Einreihenfolge sortiert bleiben.
function resolveCreatedAt(dateInput: string, timeInput: string): Date {
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
	const now = new Date();
	if (!dateMatch) return now;

	const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeInput);
	const [hours, minutes] = timeMatch
		? [Number(timeMatch[1]), Number(timeMatch[2])]
		: [now.getHours(), now.getMinutes()];

	const [, year, month, day] = dateMatch;
	const combined = new Date(
		Number(year),
		Number(month) - 1,
		Number(day),
		hours,
		minutes,
		now.getSeconds(),
		now.getMilliseconds()
	);
	return Number.isNaN(combined.getTime()) ? now : combined;
}

// Ohne diese load-Funktion macht SvelteKit bei einer Client-Side-Navigation zu dieser Route
// (z.B. per <a href="/posts/new">) keinen Server-Request, wenn es nichts zu laden gibt — der
// hooks.server.ts-Auth-Check greift dann nie und das Formular rendert ungeschützt im Browser.
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
		const title = String(data.get('title') ?? '').trim();
		const text = String(data.get('text') ?? '').trim();
		const saveAsAlbum = data.get('saveAsAlbum') === 'on';
		const albumTitle = String(data.get('albumTitle') ?? '').trim();
		const createdAt = resolveCreatedAt(
			String(data.get('date') ?? '').trim(),
			String(data.get('time') ?? '').trim()
		);
		const rawTags = parseTagsField(data.get('tags'));

		const files = data
			.getAll('photos')
			.filter((f): f is File => f instanceof File && f.size > 0);

		if (!text && files.length === 0) {
			return fail(400, { error: 'Bitte gib einen Text ein oder füge mindestens ein Foto hinzu.' });
		}

		if (saveAsAlbum && files.length < 2) {
			return fail(400, {
				error: 'Ein Album braucht mindestens zwei Fotos. Lade weitere Fotos hoch oder deaktiviere die Album-Option.'
			});
		}

		const [createdPost] = await db
			.insert(post)
			.values({
				title: title || null,
				text: text || null,
				authorId: user.id,
				createdAt
			})
			.returning();

		await setPostTags(createdPost.id, rawTags);

		let albumId: string | null = null;

		if (saveAsAlbum && files.length > 0) {
			const [createdAlbum] = await db
				.insert(album)
				.values({
					title: albumTitle || title || 'Neues Album',
					originPostId: createdPost.id,
					authorId: user.id,
					createdAt
				})
				.returning();
			albumId = createdAlbum.id;

			await db.update(post).set({ albumId }).where(eq(post.id, createdPost.id));
		}

		let position = 0;
		for (const file of files) {
			const { filename } = await saveUploadedPhoto(file);
			await db.insert(photo).values({
				filename,
				originalName: file.name,
				postId: createdPost.id,
				albumId,
				position: position++,
				createdAt
			});
		}

		throw redirect(303, '/');
	}
};
