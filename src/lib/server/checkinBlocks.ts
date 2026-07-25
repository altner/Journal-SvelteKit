import { db } from '$lib/server/db';
import { checkinBlock, checkinPhoto } from '$lib/server/db/schema';
import { saveUploadedPhoto, deleteUploadedPhoto } from '$lib/server/storage';
import { eq, desc } from 'drizzle-orm';
import type { BlockMeta } from '$lib/server/blocks';

// parseBlocksMeta and blocksMetaHasContent from lib/server/blocks.ts are generic (no
// postId/checkinId reference) and are reused as-is by callers of this module — only the
// checkin_block/checkin_photo-writing functions below need a checkin-specific copy of
// blocks.ts's post_block/photo counterparts.

type ExistingBlock = {
	id: string;
	type: 'text' | 'photos';
	photos: { id: string; filename: string }[];
};

function filesFor(meta: BlockMeta, formData: FormData): File[] {
	if (meta.type !== 'photos') return [];
	return formData.getAll(meta.fileField).filter((f): f is File => f instanceof File && f.size > 0);
}

/** Inserts a fresh, ordered set of blocks for a checkin that doesn't have any yet. Mirrors
 *  saveNewPostBlocks in blocks.ts exactly, against checkin_block/checkin_photo instead of
 *  post_block/photo. */
export async function saveNewCheckinBlocks(
	checkinId: string,
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
			await db.insert(checkinBlock).values({ checkinId, position: position++, type: 'text', text: meta.text });
			continue;
		}

		const files = filesFor(meta, formData);
		if (files.length === 0) continue;

		const [createdBlock] = await db
			.insert(checkinBlock)
			.values({ checkinId, position: position++, type: 'photos' })
			.returning();

		for (const file of files) {
			const { filename, width, height } = await saveUploadedPhoto(file);
			const [createdPhoto] = await db
				.insert(checkinPhoto)
				.values({
					filename,
					width,
					height,
					originalName: file.name,
					checkinId,
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

/** Inserts a single photos-block containing photos that were already saved to disk beforehand
 *  (via the Micropub media endpoint, see routes/api/micropub/media) rather than uploaded directly
 *  in this request's multipart body — used by routes/api/micropub/checkin's photo support, since
 *  osm-checkin (and Micropub media-endpoint clients generally) upload the file separately first
 *  and only reference its resulting URL in the h-entry JSON. No-op if `photos` is empty (no block
 *  gets created for zero photos, mirroring saveNewCheckinBlocks skipping empty blocks). */
export async function saveAlreadyUploadedCheckinPhotos(
	checkinId: string,
	photos: { filename: string; width: number; height: number; originalName?: string | null }[],
	options: { startBlockPosition?: number; startPhotoPosition?: number } = {}
): Promise<void> {
	if (photos.length === 0) return;

	const [createdBlock] = await db
		.insert(checkinBlock)
		.values({ checkinId, position: options.startBlockPosition ?? 0, type: 'photos' })
		.returning();

	let photoPosition = options.startPhotoPosition ?? 0;
	for (const p of photos) {
		await db.insert(checkinPhoto).values({
			filename: p.filename,
			width: p.width,
			height: p.height,
			originalName: p.originalName ?? null,
			checkinId,
			blockId: createdBlock.id,
			position: photoPosition++
		});
	}
}

/** Deletes a checkin_block row left with zero photos after a single photo was removed (e.g. via
 *  /photos' aggregated deletePhoto action). Mirrors pruneEmptyPhotoBlocks in blocks.ts — unlike
 *  posts, a checkin is never deleted just for losing its photos (its location is the core
 *  content), so this only prunes the empty block shell, nothing more. */
export async function pruneEmptyCheckinPhotoBlocks(checkinId: string): Promise<void> {
	const blocks = await db.query.checkinBlock.findMany({
		where: eq(checkinBlock.checkinId, checkinId),
		with: { photos: true }
	});
	for (const block of blocks) {
		if (block.type === 'photos' && block.photos.length === 0) {
			await db.delete(checkinBlock).where(eq(checkinBlock.id, block.id));
		}
	}
}

/** Reconciles a checkin's existing blocks against a freshly-submitted blocksMeta array. Mirrors
 *  reconcileEditedPostBlocks in blocks.ts exactly, against checkin_block/checkin_photo. */
export async function reconcileEditedCheckinBlocks(
	checkinId: string,
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
			await db.delete(checkinPhoto).where(eq(checkinPhoto.blockId, existing.id));
		}
		await db.delete(checkinBlock).where(eq(checkinBlock.id, existing.id));
	}

	const [maxPhoto] = await db
		.select({ position: checkinPhoto.position })
		.from(checkinPhoto)
		.where(eq(checkinPhoto.checkinId, checkinId))
		.orderBy(desc(checkinPhoto.position))
		.limit(1);
	let photoPosition = (maxPhoto?.position ?? -1) + 1;

	let position = 0;
	for (const meta of blocksMeta) {
		const existing = existingById.get(meta.id);

		if (meta.type === 'text') {
			if (!meta.text.trim()) {
				if (existing) await db.delete(checkinBlock).where(eq(checkinBlock.id, meta.id));
				continue;
			}
			if (existing) {
				await db
					.update(checkinBlock)
					.set({ position: position++, text: meta.text })
					.where(eq(checkinBlock.id, meta.id));
			} else {
				await db.insert(checkinBlock).values({ id: meta.id, checkinId, position: position++, type: 'text', text: meta.text });
			}
			continue;
		}

		if (existing) {
			await db.update(checkinBlock).set({ position: position++ }).where(eq(checkinBlock.id, meta.id));
			continue;
		}

		const files = filesFor(meta, formData);
		if (files.length === 0) continue;

		await db.insert(checkinBlock).values({ id: meta.id, checkinId, position: position++, type: 'photos' });
		for (const file of files) {
			const { filename, width, height } = await saveUploadedPhoto(file);
			await db.insert(checkinPhoto).values({
				filename,
				width,
				height,
				originalName: file.name,
				checkinId,
				blockId: meta.id,
				position: photoPosition++,
				excludeFromStream: meta.excludeFromStream ? true : null
			});
		}
	}
}
