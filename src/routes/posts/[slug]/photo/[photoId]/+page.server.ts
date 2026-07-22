import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { post } from '$lib/server/db/schema';
import { findPostBySlugOrId } from '$lib/server/posts';
import { buildPostExcerpt } from '$lib/server/seo';

export const load: PageServerLoad = async ({ params, url }) => {
	const resolved = await findPostBySlugOrId(params.slug);
	if (!resolved) throw error(404, 'Beitrag nicht gefunden');
	if (resolved.matchedBy === 'id' && resolved.post.slug) {
		throw redirect(301, `/posts/${encodeURIComponent(resolved.post.slug)}/photo/${params.photoId}`);
	}

	const found = await db.query.post.findFirst({
		where: eq(post.id, resolved.post.id),
		with: {
			photos: { orderBy: (photo, { asc }) => asc(photo.position) },
			blocks: { orderBy: (block, { asc }) => asc(block.position) }
		}
	});

	if (!found) throw error(404, 'Beitrag nicht gefunden');

	const index = found.photos.findIndex((p) => p.id === params.photoId);
	if (index === -1) throw error(404, 'Foto nicht gefunden');

	const photo = found.photos[index];

	return {
		post: found,
		index,
		description: buildPostExcerpt(found.blocks),
		canonicalUrl: `${url.origin}/posts/${found.slug}/photo/${photo.id}`,
		ogImage: `${url.origin}/uploads/${photo.filename}`
	};
};
