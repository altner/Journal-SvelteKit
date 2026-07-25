import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { post, photo, postTag, postBlock } from '$lib/server/db/schema';
import { deleteUploadedPhoto } from '$lib/server/storage';
import { slugify } from '$lib/server/slug';

type DeletablePost = {
	id: string;
	photos: { filename: string }[];
};

type EmptyCheckBlock = { type: 'text' | 'photos'; text: string | null; photos: unknown[] };

/** Deletes a post's photo files+rows, its blocks, and the post row itself. */
export async function deletePostCascade(found: DeletablePost): Promise<void> {
	for (const p of found.photos) {
		await deleteUploadedPhoto(p.filename);
	}

	await db.delete(postTag).where(eq(postTag.postId, found.id));
	await db.delete(photo).where(eq(photo.postId, found.id));
	// FKs aren't enforced at runtime (see CLAUDE.md) — postBlock rows must be deleted explicitly,
	// they don't cascade on their own just because the DDL says so.
	await db.delete(postBlock).where(eq(postBlock.postId, found.id));
	await db.delete(post).where(eq(post.id, found.id));
}

/** Generates a unique URL slug for a new post. Base is the slugified title; falls back to the
 *  post's own id (already guaranteed unique) when there's no usable title (none given, or a title
 *  that slugifies to nothing, e.g. emoji-only). On a collision (e.g. two addPhotos status posts
 *  for the same album producing the identical auto-generated title), appends -2, -3, ... until
 *  free. Must be called with the post's id already decided (before insert), since the id may
 *  itself become the slug. */
export async function generatePostSlug(title: string | null, id: string): Promise<string> {
	const base = slugify(title ?? '') || id;
	let candidate = base;
	let n = 2;
	while (await db.query.post.findFirst({ where: eq(post.slug, candidate) })) {
		candidate = `${base}-${n++}`;
	}
	return candidate;
}

/** Resolves a `/posts/[slug]` route param to a post, trying the slug first and falling back to a
 *  raw id match for links shared/indexed before this post had a slug. Callers should 301-redirect
 *  to the canonical slug URL when `matchedBy === 'id'`. */
export async function findPostBySlugOrId(
	param: string
): Promise<{ post: { id: string; slug: string | null }; matchedBy: 'slug' | 'id' } | null> {
	const bySlug = await db.query.post.findFirst({ where: eq(post.slug, param) });
	if (bySlug) return { post: bySlug, matchedBy: 'slug' };

	const byId = await db.query.post.findFirst({ where: eq(post.id, param) });
	if (byId) return { post: byId, matchedBy: 'id' };

	return null;
}

/** A post with no remaining photos and no user-authored content (no title, no text) is an empty
 *  shell that can be removed. */
export function isPostNowEmpty(p: { title: string | null }, blocks: EmptyCheckBlock[]): boolean {
	const totalPhotos = blocks.reduce((sum, b) => sum + b.photos.length, 0);
	if (totalPhotos > 0) return false;
	const hasText = blocks.some((b) => b.type === 'text' && b.text?.trim());
	return !p.title && !hasText;
}
