/** Strips common markdown syntax to plain text and collapses whitespace — good enough for a meta
 *  description excerpt, not a full markdown-to-text converter (that's what `marked` is for). */
function stripMarkdown(markdown: string): string {
	return markdown
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt text
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> label text
		.replace(/(^|\n)\s{0,3}[#>*+-]+\s*/g, '$1') // heading/quote/list markers
		.replace(/[*_`~]/g, '') // emphasis/code markers
		.replace(/\s+/g, ' ')
		.trim();
}

/** Builds a meta-description-length excerpt from a post's first non-empty text block. Returns ''
 *  when the post has no text block (photos-only posts, or a status post with no added caption). */
export function buildPostExcerpt(
	blocks: { type: string; text: string | null }[],
	maxLen = 160
): string {
	const firstText = blocks.find((b) => b.type === 'text' && b.text?.trim());
	if (!firstText?.text) return '';

	const plain = stripMarkdown(firstText.text);
	if (plain.length <= maxLen) return plain;

	const truncated = plain.slice(0, maxLen);
	const lastSpace = truncated.lastIndexOf(' ');
	return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLen)}…`;
}

/** Picks the filename of the photo to use as a post's og:image. Replicates the "origin post shows
 *  the album's current photos, not just its own" rendering quirk (see CLAUDE.md) — otherwise the
 *  OG image of an origin post wouldn't reflect photos added to its album later via `addPhotos`. */
export function pickPostOgImage(post: {
	id: string;
	blocks: { type: string; photos: { filename: string }[] }[];
	album: { originPostId: string | null; photos: { filename: string }[] } | null;
}): string | null {
	if (post.album && post.album.originPostId === post.id) {
		return post.album.photos[0]?.filename ?? null;
	}
	for (const block of post.blocks) {
		if (block.type === 'photos' && block.photos.length > 0) return block.photos[0].filename;
	}
	return null;
}
