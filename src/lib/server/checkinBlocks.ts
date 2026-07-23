import { db } from '$lib/server/db';
import { checkinBlock, checkinPhoto } from '$lib/server/db/schema';
import { saveUploadedPhoto, deleteUploadedPhoto } from '$lib/server/storage';
import { eq, desc } from 'drizzle-orm';
import type { BlockMeta } from '$lib/server/blocks';

// parseBlocksMeta, blocksMetaHasContent, and countNonExcludedNewFiles from lib/server/blocks.ts
// are generic (no postId/checkinId reference) and are reused as-is by callers of this module —
// only the checkin_block/checkin_photo-writing functions below need a checkin-specific copy of
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
