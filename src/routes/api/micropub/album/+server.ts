import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post } from '$lib/server/db/schema';
import { generatePostSlug } from '$lib/server/posts';
import { createAlbumFromPost } from '$lib/server/albums';
import { saveNewPostBlocks, countNonExcludedNewFiles, type BlockMeta } from '$lib/server/blocks';
import { authorizeMicropubRequest } from '$lib/server/micropubAuth';

// An album always needs a carrying `post` row underneath (photo.postId is NOT NULL in the
// schema — there is no post-less photo), same as the web composer's "save as album" flow. Unlike
// routes/api/micropub/post, this endpoint's whole contract is about the album: no separate
// post-title field, no required body text — the post exists purely to hold the photos.
export const POST: RequestHandler = async ({ request, url }) => {
	const data = await request.formData();
	const owner = await authorizeMicropubRequest(request, data);

	const title = String(data.get('title') ?? '').trim();
	if (!title) throw error(400, 'title is required');

	const description = String(data.get('description') ?? '').trim();
	const content = String(data.get('content') ?? '').trim();

	const blocksMetaForCount: BlockMeta[] = [
		{ id: randomUUID(), type: 'photos', fileField: 'photo', excludeFromStream: false }
	];
	if (countNonExcludedNewFiles(blocksMetaForCount, data) < 2) {
		throw error(400, 'at least 2 photos are required');
	}

	const id = randomUUID();
	const slug = await generatePostSlug(title, id);
	const createdAt = new Date();

	await db.insert(post).values({
		id,
		slug,
		title,
		authorId: owner.id,
		createdAt
	});

	const blocksMeta: BlockMeta[] = [];
	if (content) blocksMeta.push({ id: randomUUID(), type: 'text', text: content });
	blocksMeta.push({ id: randomUUID(), type: 'photos', fileField: 'photo', excludeFromStream: false });
	const { nonExcludedPhotoIds } = await saveNewPostBlocks(id, blocksMeta, data);

	const { albumSlug } = await createAlbumFromPost(
		id,
		{ title, description: description || null },
		nonExcludedPhotoIds,
		owner.id,
		createdAt
	);

	return new Response(null, { status: 201, headers: { Location: `${url.origin}/albums/${albumSlug}` } });
};
