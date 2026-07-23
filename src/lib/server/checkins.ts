import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { checkin, checkinPhoto, checkinBlock } from '$lib/server/db/schema';
import { deleteUploadedPhoto } from '$lib/server/storage';
import { slugify } from '$lib/server/slug';

type DeletableCheckin = {
	id: string;
	photos: { filename: string }[];
};

/** Deletes a checkin's photo files+rows, its blocks, and the checkin row itself. Unlike
 *  deletePostCascade, there's no album (or tags) to worry about — checkins never create or
 *  contribute to albums, and aren't taggable. */
export async function deleteCheckinCascade(found: DeletableCheckin): Promise<void> {
	for (const p of found.photos) {
		await deleteUploadedPhoto(p.filename);
	}

	await db.delete(checkinPhoto).where(eq(checkinPhoto.checkinId, found.id));
	// FKs aren't enforced at runtime (see CLAUDE.md) — checkinBlock rows must be deleted
	// explicitly, they don't cascade on their own just because the DDL says so.
	await db.delete(checkinBlock).where(eq(checkinBlock.checkinId, found.id));
	await db.delete(checkin).where(eq(checkin.id, found.id));
}

/** Generates a unique URL slug for a new checkin. Mirrors generatePostSlug in posts.ts — same
 *  algorithm, but checked against checkin.slug (a separate uniqueness namespace from post.slug,
 *  since checkins live under their own /checkins/... URL prefix). */
export async function generateCheckinSlug(title: string | null, id: string): Promise<string> {
	const base = slugify(title ?? '') || id;
	let candidate = base;
	let n = 2;
	while (await db.query.checkin.findFirst({ where: eq(checkin.slug, candidate) })) {
		candidate = `${base}-${n++}`;
	}
	return candidate;
}

/** Resolves a `/checkins/[slug]` route param to a checkin, trying the slug first and falling back
 *  to a raw id match for links shared/indexed before this checkin had a slug (or the Micropub
 *  Location header, which is slug-based but predates this being enforced everywhere). Callers
 *  should 301-redirect to the canonical slug URL when `matchedBy === 'id'`. */
export async function findCheckinBySlugOrId(
	param: string
): Promise<{ checkin: { id: string; slug: string | null }; matchedBy: 'slug' | 'id' } | null> {
	const bySlug = await db.query.checkin.findFirst({ where: eq(checkin.slug, param) });
	if (bySlug) return { checkin: bySlug, matchedBy: 'slug' };

	const byId = await db.query.checkin.findFirst({ where: eq(checkin.id, param) });
	if (byId) return { checkin: byId, matchedBy: 'id' };

	return null;
}
