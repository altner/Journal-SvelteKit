import { error } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Shared by the three routes/api/micropub/{checkin,post,album} endpoints — own-Shortcut-only,
// authenticated with a single static bearer token from `.env` (MICROPUB_TOKEN), not IndieAuth.
// See CLAUDE.md / tasks/todo.md for why full IndieAuth was deliberately skipped.
function isAuthorized(request: Request): boolean {
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

/** Runs the bearer-token check, the `h=entry` check (the one remaining Micropub-flavored
 *  requirement all three endpoints share), and resolves the content owner — throws 401/400/500
 *  as appropriate. Callers get back the owner row and can proceed straight to their own
 *  type-specific field parsing. */
export async function authorizeMicropubRequest(
	request: Request,
	data: FormData
): Promise<{ id: string }> {
	if (!isAuthorized(request)) throw error(401, 'Unauthorized');

	const h = String(data.get('h') ?? 'entry');
	if (h !== 'entry') throw error(400, 'Only h=entry is supported');

	const ownerEmail = env.MICROPUB_USER_EMAIL;
	if (!ownerEmail) throw error(500, 'MICROPUB_USER_EMAIL is not configured');

	const owner = await db.query.user.findFirst({ where: eq(user.email, ownerEmail) });
	if (!owner) throw error(500, 'MICROPUB_USER_EMAIL does not match any user');

	return owner;
}
