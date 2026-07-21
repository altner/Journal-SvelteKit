/** Unicode-aware slugify: lowercases, collapses runs of non-letter/non-number characters to a
 *  single hyphen, trims leading/trailing hyphens. Used for both tag slugs and post slugs. */
export function slugify(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}
