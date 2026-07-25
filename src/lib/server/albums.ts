import { db } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { album, albumPhoto } from '$lib/server/db/schema';
import { slugify } from '$lib/server/slug';
import { saveUploadedPhoto } from '$lib/server/storage';
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

/** Creates a brand-new, fully independent album with its own photos — no carrier `post` involved
 *  (unlike the old `createAlbumFromPost`). Used by both the web `createAlbum` action and the
 *  Micropub album endpoint. `createdAt` is shared by every inserted `album_photo` row and the
 *  album itself, so the feed's batch-grouping (see routes/+page.server.ts) recognizes this as the
 *  album's "created" event rather than a later "photos added" one. */
export async function createAlbum(
	info: { title: string; description: string | null },
	files: File[],
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
		authorId,
		createdAt
	});

	let position = 0;
	for (const file of files) {
		const { filename, width, height } = await saveUploadedPhoto(file);
		await db.insert(albumPhoto).values({
			filename,
			width,
			height,
			originalName: file.name,
			albumId,
			position: position++,
			createdAt
		});
	}

	return { albumId, albumSlug };
}

/** Appends photos to an already-existing album, continuing the position sequence and stamping
 *  every new row with the same fresh `createdAt` — that shared timestamp is what makes this batch
 *  show up as its own "N photos added to album X" feed event, distinct from the album's original
 *  creation event and any earlier addition batch. */
export async function addPhotosToAlbum(albumId: string, files: File[], createdAt: Date): Promise<void> {
	const [lastPhoto] = await db
		.select({ position: albumPhoto.position })
		.from(albumPhoto)
		.where(eq(albumPhoto.albumId, albumId))
		.orderBy(desc(albumPhoto.position))
		.limit(1);
	let position = (lastPhoto?.position ?? -1) + 1;

	for (const file of files) {
		const { filename, width, height } = await saveUploadedPhoto(file);
		await db.insert(albumPhoto).values({
			filename,
			width,
			height,
			originalName: file.name,
			albumId,
			position: position++,
			createdAt
		});
	}
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
