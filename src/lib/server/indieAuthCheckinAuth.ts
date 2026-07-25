import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Verifies Bearer tokens against an external IndieAuth server's /introspect endpoint (see
// /Users/adrian/Projects/indie-auth). Used by routes/api/micropub/checkin (only auth path) and,
// via verifyIndieAuthCreateScope, as a fallback auth path for routes/api/micropub/post alongside
// micropubAuth.ts's static-token check (album stays static-token-only, no IndieAuth path).
interface IntrospectionResult {
	active: boolean;
	me?: string;
	scope?: string;
}

async function introspectToken(token: string, fetchFn: typeof fetch): Promise<IntrospectionResult> {
	const introspectUrl = env.INDIEAUTH_INTROSPECT_URL;
	if (!introspectUrl) throw error(500, 'INDIEAUTH_INTROSPECT_URL is not configured');

	const res = await fetchFn(introspectUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token })
	});
	if (!res.ok) return { active: false };
	return (await res.json()) as IntrospectionResult;
}

/** Bearer-token-only IndieAuth check (introspection + `me`/`create`-scope check), without the
 *  owner-resolution step — callers that already have their own owner lookup (e.g. micropubAuth.ts)
 *  can use this instead of authorizeIndieAuthCheckinRequest to avoid a second, redundant DB lookup
 *  path. Returns a boolean instead of throwing, since callers here need to fall through to a
 *  different auth method (the static token) rather than fail immediately. */
export async function verifyIndieAuthCreateScope(
	token: string,
	fetchFn: typeof fetch
): Promise<boolean> {
	const result = await introspectToken(token, fetchFn);
	const expectedMe = env.INDIEAUTH_ME;
	if (!expectedMe) throw error(500, 'INDIEAUTH_ME is not configured');
	const scopes = (result.scope ?? '').split(' ').filter(Boolean);
	return result.active === true && result.me === expectedMe && scopes.includes('create');
}

/** Verifies the Authorization Bearer token via IndieAuth introspection, checks it was issued for
 *  this blog's identity with the `create` scope, and resolves the (single) owner account. */
export async function authorizeIndieAuthCheckinRequest(
	request: Request,
	fetchFn: typeof fetch
): Promise<{ id: string }> {
	const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
	if (!match) throw error(401, 'Unauthorized');

	const result = await introspectToken(match[1], fetchFn);

	const expectedMe = env.INDIEAUTH_ME;
	if (!expectedMe) throw error(500, 'INDIEAUTH_ME is not configured');

	const scopes = (result.scope ?? '').split(' ').filter(Boolean);
	if (!result.active || result.me !== expectedMe || !scopes.includes('create')) {
		throw error(401, 'Unauthorized');
	}

	const ownerEmail = env.MICROPUB_USER_EMAIL;
	if (!ownerEmail) throw error(500, 'MICROPUB_USER_EMAIL is not configured');

	const owner = await db.query.user.findFirst({ where: eq(user.email, ownerEmail) });
	if (!owner) throw error(500, 'MICROPUB_USER_EMAIL does not match any user');

	return owner;
}
