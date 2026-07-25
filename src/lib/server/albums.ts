import { db } from '$lib/server/db';
import { eq, inArray } from 'drizzle-orm';
import { album, photo, post } from '$lib/server/db/schema';
import { slugify } from '$lib/server/slug';
import { randomUUID } from 'node:crypto';

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

/** Creates an album from an already-existing post's photos, linking both the post and the given
 *  photos to it. Used by `routes/api/micropub/album/+server.ts`, the only album-creation path now
 *  that album creation moved from the (removed) web composer to Micropub-only. */
export async function createAlbumFromPost(
	postId: string,
	info: { title: string; description: string | null },
	photoIds: string[],
	authorId: string,
	createdAt: Date
): Promise<{ albumId: string; albumSlug: string }> {
	const albumId = randomUUID();
	const albumSlug = await generateAlbumSlug(info.title, albumId);

	await db.insert(album).values({
		id: albumId,
		slug: albumSlug,
		title: info.title,
		description: info.description,
		originPostId: postId,
		authorId,
		createdAt
	});

	await db.update(post).set({ albumId }).where(eq(post.id, postId));
	await db.update(photo).set({ albumId }).where(inArray(photo.id, photoIds));

	return { albumId, albumSlug };
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
