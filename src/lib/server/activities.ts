import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { activity } from '$lib/server/db/schema';
import { slugify } from '$lib/server/slug';
import type { Sport } from '$lib/server/gpx';

export const ALLOWED_SPORTS = ['running', 'cycling', 'hiking', 'walking', 'other'] as const;

const SPORT_LABEL_DE: Record<Sport, string> = {
	running: 'Lauf',
	cycling: 'Radtour',
	hiking: 'Wanderung',
	walking: 'Spaziergang',
	other: 'Aktivität'
};

/** Whitelist-validates a raw form/GPX-detected sport value — Drizzle's `{enum:[...]}` is
 *  TypeScript-only, drizzle-kit push emits no SQL CHECK constraint for it, so a raw form value
 *  must be validated before it ever reaches an insert. Falls back to 'other' for anything
 *  unrecognized rather than rejecting the upload over it. */
export function normalizeSport(raw: string | null | undefined): Sport {
	return (ALLOWED_SPORTS as readonly string[]).includes(raw ?? '') ? (raw as Sport) : 'other';
}

export function sportLabel(sport: Sport): string {
	return SPORT_LABEL_DE[sport];
}

/** "Lauf am 21.07.2026" — used only when the user submitted no title, same auto-title spirit as
 *  the addPhotos status posts. */
export function buildFallbackTitle(sport: Sport, startedAt: Date): string {
	const date = startedAt.toLocaleDateString('de-DE', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	return `${SPORT_LABEL_DE[sport]} am ${date}`;
}

/** Generates a unique URL slug for a new activity. activity.title is always populated (never
 *  null, unlike post.title), so — like generateAlbumSlug — there's no nullable-title branch. */
export async function generateActivitySlug(title: string, id: string): Promise<string> {
	const base = slugify(title) || id;
	let candidate = base;
	let n = 2;
	while (await db.query.activity.findFirst({ where: eq(activity.slug, candidate) })) {
		candidate = `${base}-${n++}`;
	}
	return candidate;
}

/** Resolves a `/activities/[slug]` route param to an activity, trying the slug first and falling
 *  back to a raw id match for links shared before this activity had a slug. Callers should
 *  301-redirect to the canonical slug URL when `matchedBy === 'id'`. */
export async function findActivityBySlugOrId(
	param: string
): Promise<{ activity: { id: string; slug: string | null }; matchedBy: 'slug' | 'id' } | null> {
	const bySlug = await db.query.activity.findFirst({ where: eq(activity.slug, param) });
	if (bySlug) return { activity: bySlug, matchedBy: 'slug' };

	const byId = await db.query.activity.findFirst({ where: eq(activity.id, param) });
	if (byId) return { activity: byId, matchedBy: 'id' };

	return null;
}

/** Even-interval downsampling for map rendering only — first and last point are always kept
 *  exactly. Distance/duration/elevation are computed from the full-resolution track in gpx.ts,
 *  never from this. */
export function downsampleTrack(points: [number, number][], cap = 500): [number, number][] {
	if (points.length <= cap) return points;
	const result: [number, number][] = [];
	for (let i = 0; i < cap; i++) {
		result.push(points[Math.round((i * (points.length - 1)) / (cap - 1))]);
	}
	return result;
}
