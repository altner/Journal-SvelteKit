import { db } from '$lib/server/db';
import { postBlock, photo } from '$lib/server/db/schema';
import { saveUploadedPhoto, deleteUploadedPhoto } from '$lib/server/storage';
import { eq, desc } from 'drizzle-orm';

export type BlockMeta =
	| { id: string; type: 'text'; text: string }
	| { id: string; type: 'photos'; fileField: string; excludeFromStream: boolean };

type ExistingBlock = {
	id: string;
	type: 'text' | 'photos';
	photos: { id: string; filename: string }[];
};

/** Parses the `blocksMeta` hidden JSON field the BlockEditor component always submits. */
export function parseBlocksMeta(raw: FormDataEntryValue | null): BlockMeta[] {
	if (typeof raw !== 'string' || !raw.trim()) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(b): b is BlockMeta =>
				b &&
				typeof b.id === 'string' &&
				(b.type === 'text' ? typeof b.text === 'string' : typeof b.fileField === 'string')
		);
	} catch {
		return [];
	}
}

function filesFor(meta: BlockMeta, formData: FormData): File[] {
	if (meta.type !== 'photos') return [];
	return formData.getAll(meta.fileField).filter((f): f is File => f instanceof File && f.size > 0);
}

/** Whether the submitted blocks amount to any real content — a text block with text, an existing
 *  photo block (already has photos in the DB), or a new photo block with files attached. Mirrors
 *  the pre-blocks `text || photos.length > 0` validation, generalized across a whole block list. */
export function blocksMetaHasContent(
	blocksMeta: BlockMeta[],
	formData: FormData,
	existingPhotoBlockIds: Set<string> = new Set()
): boolean {
	return blocksMeta.some((meta) => {
		if (meta.type === 'text') return meta.text.trim() !== '';
		if (existingPhotoBlockIds.has(meta.id)) return true;
		return filesFor(meta, formData).length > 0;
	});
}

/** Total files attached to non-excluded photo blocks — used for the "album needs >=2 photos"
 *  check before anything is written, since "excluded" (e.g. infographic) blocks never count
 *  toward album eligibility. */
export function countNonExcludedNewFiles(blocksMeta: BlockMeta[], formData: FormData): number {
	return blocksMeta.reduce((sum, meta) => {
		if (meta.type !== 'photos' || meta.excludeFromStream) return sum;
		return sum + filesFor(meta, formData).length;
	}, 0);
}

/** Inserts a fresh, ordered set of blocks for a post that doesn't have any yet (new post, or a
 *  new `addPhotos`-style status post). Skips blocks with no real content (empty text, no files).
 *  Returns the ids of newly-created, non-excluded photos — the caller uses these to decide album
 *  membership. */
export async function saveNewPostBlocks(
	postId: string,
	blocksMeta: BlockMeta[],
	formData: FormData,
	options: { startBlockPosition?: number; startPhotoPosition?: number } = {}
): Promise<{ nonExcludedPhotoIds: string[] }> {
	let position = options.startBlockPosition ?? 0;
	let photoPosition = options.startPhotoPosition ?? 0;
	const nonExcludedPhotoIds: string[] = [];

	for (const meta of blocksMeta) {
		if (meta.type === 'text') {
			if (!meta.text.trim()) continue;
			await db.insert(postBlock).values({ postId, position: position++, type: 'text', text: meta.text });
			continue;
		}

		const files = filesFor(meta, formData);
		if (files.length === 0) continue;

		const [createdBlock] = await db
			.insert(postBlock)
			.values({ postId, position: position++, type: 'photos' })
			.returning();

		for (const file of files) {
			const { filename, width, height } = await saveUploadedPhoto(file);
			const [createdPhoto] = await db
				.insert(photo)
				.values({
					filename,
					width,
					height,
					originalName: file.name,
					postId,
					blockId: createdBlock.id,
					position: photoPosition++,
					excludeFromStream: meta.excludeFromStream ? true : null
				})
				.returning();
			if (!meta.excludeFromStream) nonExcludedPhotoIds.push(createdPhoto.id);
		}
	}

	return { nonExcludedPhotoIds };
}

/** Reconciles a post's existing blocks against a freshly-submitted `blocksMeta` array: removed
 *  blocks (and, for photo blocks, their files) are deleted, new blocks are inserted, kept blocks
 *  only get their `position` (and, for text blocks, their content) updated. Existing photo blocks
 *  are never content-edited here — removing photos or adding more to an existing block isn't
 *  supported, only adding a whole new photo block or removing an existing one outright. */
export async function reconcileEditedPostBlocks(
	postId: string,
	existingBlocks: ExistingBlock[],
	blocksMeta: BlockMeta[],
	formData: FormData
): Promise<void> {
	const existingById = new Map(existingBlocks.map((b) => [b.id, b]));
	const keptIds = new Set(blocksMeta.map((m) => m.id));

	for (const existing of existingBlocks) {
		if (keptIds.has(existing.id)) continue;
		for (const p of existing.photos) {
			await deleteUploadedPhoto(p.filename);
		}
		if (existing.photos.length > 0) {
			await db.delete(photo).where(eq(photo.blockId, existing.id));
		}
		await db.delete(postBlock).where(eq(postBlock.id, existing.id));
	}

	const [maxPhoto] = await db
		.select({ position: photo.position })
		.from(photo)
		.where(eq(photo.postId, postId))
		.orderBy(desc(photo.position))
		.limit(1);
	let photoPosition = (maxPhoto?.position ?? -1) + 1;

	let position = 0;
	for (const meta of blocksMeta) {
		const existing = existingById.get(meta.id);

		if (meta.type === 'text') {
			if (!meta.text.trim()) {
				if (existing) await db.delete(postBlock).where(eq(postBlock.id, meta.id));
				continue;
			}
			if (existing) {
				await db
					.update(postBlock)
					.set({ position: position++, text: meta.text })
					.where(eq(postBlock.id, meta.id));
			} else {
				await db.insert(postBlock).values({ id: meta.id, postId, position: position++, type: 'text', text: meta.text });
			}
			continue;
		}

		if (existing) {
			await db.update(postBlock).set({ position: position++ }).where(eq(postBlock.id, meta.id));
			continue;
		}

		const files = filesFor(meta, formData);
		if (files.length === 0) continue;

		await db.insert(postBlock).values({ id: meta.id, postId, position: position++, type: 'photos' });
		for (const file of files) {
			const { filename, width, height } = await saveUploadedPhoto(file);
			await db.insert(photo).values({
				filename,
				width,
				height,
				originalName: file.name,
				postId,
				blockId: meta.id,
				position: photoPosition++,
				excludeFromStream: meta.excludeFromStream ? true : null
			});
		}
	}
}

/** Deletes any `postBlock` of type='photos' that has no photos left — e.g. after a photo was
 *  individually removed via the albums/[id] deletePhoto action, or after an album-wide photo
 *  purge in deleteAlbum. Leaves text blocks and non-empty photo blocks untouched. */
export async function pruneEmptyPhotoBlocks(postId: string): Promise<void> {
	const blocks = await db.query.postBlock.findMany({
		where: eq(postBlock.postId, postId),
		with: { photos: true }
	});
	for (const block of blocks) {
		if (block.type === 'photos' && block.photos.length === 0) {
			await db.delete(postBlock).where(eq(postBlock.id, block.id));
		}
	}
}
