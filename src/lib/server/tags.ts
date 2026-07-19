import { db } from '$lib/server/db';
import { tag, postTag } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export function slugifyTag(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

/** Parses the comma-joined `tags` FormData field the shared TagInput chip UI always submits. */
export function parseTagsField(raw: FormDataEntryValue | null): string[] {
	if (typeof raw !== 'string' || !raw.trim()) return [];
	return raw
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}

/** Resolves each name to an existing tag (matched case-insensitively via slug) or creates a new
 *  one, keeping the as-typed casing as `name`. Returns de-duplicated tag ids, first-seen order. */
async function resolveOrCreateTags(names: string[]): Promise<string[]> {
	const seenSlugs = new Set<string>();
	const ids: string[] = [];

	for (const rawName of names) {
		const name = rawName.trim();
		const slug = slugifyTag(name);
		if (!slug || seenSlugs.has(slug)) continue;
		seenSlugs.add(slug);

		const existing = await db.query.tag.findFirst({ where: eq(tag.slug, slug) });
		if (existing) {
			ids.push(existing.id);
			continue;
		}

		const [created] = await db.insert(tag).values({ name, slug }).returning();
		ids.push(created.id);
	}

	return ids;
}

/** Replaces a post's entire tag set. Used by both post creation (no-op delete, pure insert) and
 *  post editing (delete-then-reinsert) so both call sites share one code path. */
export async function setPostTags(postId: string, rawNames: string[]): Promise<void> {
	const tagIds = await resolveOrCreateTags(rawNames);

	await db.delete(postTag).where(eq(postTag.postId, postId));

	for (const tagId of tagIds) {
		await db.insert(postTag).values({ postId, tagId });
	}
}
