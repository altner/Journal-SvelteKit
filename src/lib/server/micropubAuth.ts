import { error } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyIndieAuthCreateScope } from '$lib/server/indieAuthCheckinAuth';

// Shared by the three routes/api/micropub/{checkin,post,album} endpoints — own-Shortcut-only,
// authenticated with a single static bearer token from `.env` (MICROPUB_TOKEN), not IndieAuth.
// See CLAUDE.md / tasks/todo.md for why full IndieAuth was deliberately skipped for album/checkin
// originally. `post` has since grown a second, IndieAuth-based auth path (see
// authorizeMicropubPostRequest below) for external browser clients like Quill; album stays
// static-token-only since Quill never creates albums.
function isStaticTokenAuthorized(request: Request): boolean {
	const expected = env.MICROPUB_TOKEN;
	if (!expected) return false;

	const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
	if (!match) return false;

	const provided = Buffer.from(match[1]);
	const expectedBuf = Buffer.from(expected);
	// timingSafeEqual throws on length mismatch instead of returning false, and requires
	// same-length buffers — compare lengths first.
	if (provided.length !== expectedBuf.length) return false;
	return timingSafeEqual(provided, expectedBuf);
}

async function resolveMicropubOwner(): Promise<{ id: string }> {
	const ownerEmail = env.MICROPUB_USER_EMAIL;
	if (!ownerEmail) throw error(500, 'MICROPUB_USER_EMAIL is not configured');

	const owner = await db.query.user.findFirst({ where: eq(user.email, ownerEmail) });
	if (!owner) throw error(500, 'MICROPUB_USER_EMAIL does not match any user');

	return owner;
}

/** Runs the static-bearer-token check, the `h=entry` check (the one remaining Micropub-flavored
 *  requirement all three endpoints share), and resolves the content owner — throws 401/400/500
 *  as appropriate. Callers get back the owner row and can proceed straight to their own
 *  type-specific field parsing. Used by checkin's legacy path and album (both static-token-only). */
export async function authorizeMicropubRequest(
	request: Request,
	data: FormData
): Promise<{ id: string }> {
	if (!isStaticTokenAuthorized(request)) throw error(401, 'Unauthorized');

	const h = String(data.get('h') ?? 'entry');
	if (h !== 'entry') throw error(400, 'Only h=entry is supported');

	return resolveMicropubOwner();
}

/** Like authorizeMicropubRequest, but also accepts a real IndieAuth Bearer token (introspected
 *  with `create` scope) as an alternative to the static token — this is what lets a browser-based
 *  IndieAuth client like Quill post here without knowing the shared secret. Static token is tried
 *  first (no network round-trip); IndieAuth introspection only runs if that fails. */
export async function authorizeMicropubPostRequest(
	request: Request,
	data: FormData,
	fetchFn: typeof fetch
): Promise<{ id: string }> {
	if (!isStaticTokenAuthorized(request)) {
		const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
		const indieAuthOk = match ? await verifyIndieAuthCreateScope(match[1], fetchFn) : false;
		if (!indieAuthOk) throw error(401, 'Unauthorized');
	}

	const h = String(data.get('h') ?? 'entry');
	if (h !== 'entry') throw error(400, 'Only h=entry is supported');

	return resolveMicropubOwner();
}
