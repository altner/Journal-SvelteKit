import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { post, photo, album, postTag } from '$lib/server/db/schema';
import { deleteUploadedPhoto } from '$lib/server/storage';

type DeletablePost = {
	id: string;
	photos: { filename: string }[];
	album: { id: string; originPostId: string | null } | null;
};

/** Deletes a post's photo files+rows and the post row itself; nulls album.originPostId
 *  if this post was that album's origin. Never touches the album row. */
export async function deletePostCascade(found: DeletablePost): Promise<void> {
	if (found.album && found.album.originPostId === found.id) {
		await db.update(album).set({ originPostId: null }).where(eq(album.id, found.album.id));
	}

	for (const p of found.photos) {
		await deleteUploadedPhoto(p.filename);
	}

	await db.delete(postTag).where(eq(postTag.postId, found.id));
	await db.delete(photo).where(eq(photo.postId, found.id));
	await db.delete(post).where(eq(post.id, found.id));
}

/** A post with no remaining photos and no user-authored content is an empty shell that can be
 *  removed. Status posts always carry an auto-generated `title` ("X wurde hinzugefügt") that
 *  isn't real content, so their title is ignored — only their optional `text` counts. */
export function isPostNowEmpty(
	p: { title: string | null; text: string | null; isStatusPost: boolean },
	remainingPhotos: number
): boolean {
	if (remainingPhotos > 0) return false;
	return p.isStatusPost ? !p.text : !p.title && !p.text;
}
