import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { album } from '$lib/server/db/schema';
import { slugify } from '$lib/server/slug';

/** Generates a unique URL slug for a new album — same scheme as generatePostSlug in posts.ts.
 *  Album titles are required (not nullable), so the id-fallback branch only matters for the rare
 *  case a title slugifies to nothing (e.g. emoji-only). Must be called with the album's id already
 *  decided (before insert), since the id may itself become the slug. */
export async function generateAlbumSlug(title: string, id: string): Promise<string> {
	const base = slugify(title) || id;
	let candidate = base;
	let n = 2;
	while (await db.query.album.findFirst({ where: eq(album.slug, candidate) })) {
		candidate = `${base}-${n++}`;
	}
	return candidate;
}

/** Resolves a `/albums/[slug]` route param to an album, trying the slug first and falling back to
 *  a raw id match for links shared/indexed before this album had a slug. Callers should
 *  301-redirect to the canonical slug URL when `matchedBy === 'id'`. */
export async function findAlbumBySlugOrId(
	param: string
): Promise<{ album: { id: string; slug: string | null }; matchedBy: 'slug' | 'id' } | null> {
	const bySlug = await db.query.album.findFirst({ where: eq(album.slug, param) });
	if (bySlug) return { album: bySlug, matchedBy: 'slug' };

	const byId = await db.query.album.findFirst({ where: eq(album.id, param) });
	if (byId) return { album: byId, matchedBy: 'id' };

	return null;
}
