import { error } from '@sveltejs/kit';
import { randomBytes, createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';

interface PendingLogin {
	codeVerifier: string;
	redirectTo: string;
	expiresAt: number;
}

// Single Node process backs this whole app (no clustering) — an in-memory Map keyed by `state`
// is enough, no shared store needed. Entries are single-use (deleted on completeLogin, success or
// failure) and expire after a few minutes to bound memory if a login is started but never
// finished.
const pending = new Map<string, PendingLogin>();
const PENDING_TTL_MS = 10 * 60 * 1000;

function cleanupExpired() {
	const now = Date.now();
	for (const [state, entry] of pending) {
		if (entry.expiresAt < now) pending.delete(state);
	}
}

function requireEnv(name: string): string {
	const value = (env as Record<string, string | undefined>)[name];
	if (!value) throw error(500, `${name} is not configured`);
	return value;
}

/** Builds the redirect_uri/client_id pair used for both the /auth and /token requests — must be
 *  byte-identical between the two, per the auth server's token-route.ts check. */
function clientUrls() {
	const origin = requireEnv('ORIGIN');
	return { clientId: `${origin}/`, redirectUri: `${origin}/login/callback` };
}

/** Starts an IndieAuth login: generates a PKCE verifier + single-use state, stashes them
 *  server-side, and returns the URL to redirect the browser to. Deliberately requests no scope —
 *  this is a pure "confirm I'm INDIEAUTH_ME" login, not an API credential, so the token endpoint's
 *  scope-less shortcut (returns `{ me }`, issues no access token) applies; see completeLogin. */
export function startLogin(redirectTo: string): { url: string } {
	cleanupExpired();

	const codeVerifier = randomBytes(32).toString('base64url');
	const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
	const state = randomBytes(16).toString('base64url');

	pending.set(state, { codeVerifier, redirectTo, expiresAt: Date.now() + PENDING_TTL_MS });

	const authorizeEndpoint = requireEnv('INDIEAUTH_AUTHORIZATION_ENDPOINT');
	const me = requireEnv('INDIEAUTH_ME');
	const { clientId, redirectUri } = clientUrls();

	const url = new URL(authorizeEndpoint);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', clientId);
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('state', state);
	url.searchParams.set('code_challenge', codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	url.searchParams.set('scope', '');
	url.searchParams.set('me', me);

	return { url: url.toString() };
}

type CallbackParams = {
	code: string | null;
	state: string | null;
	error: string | null;
	iss: string | null;
};

/** Exchanges the authorization code for a confirmed `me`, validating state (single-use, bound to
 *  the verifier from startLogin), PKCE, and the expected identity. Returns the original
 *  redirectTo on success, or a user-facing failure message otherwise — never throws for
 *  expected/user-caused failures (denied consent, expired flow, wrong identity). */
export async function completeLogin(
	params: CallbackParams,
	fetchFn: typeof fetch
): Promise<{ redirectTo: string } | { failure: string }> {
	cleanupExpired();

	if (params.error) return { failure: `IndieAuth-Login abgelehnt (${params.error}).` };
	if (!params.code || !params.state) {
		return { failure: 'Ungültige Antwort vom IndieAuth-Server.' };
	}

	const entry = pending.get(params.state);
	pending.delete(params.state); // single-use regardless of outcome below
	if (!entry) {
		return { failure: 'Login-Anfrage abgelaufen oder bereits verwendet. Bitte erneut versuchen.' };
	}

	const tokenEndpoint = requireEnv('INDIEAUTH_TOKEN_ENDPOINT');
	const me = requireEnv('INDIEAUTH_ME');
	const { clientId, redirectUri } = clientUrls();

	if (params.iss && params.iss !== new URL(tokenEndpoint).origin) {
		return { failure: 'Unerwarteter Issuer vom IndieAuth-Server.' };
	}

	const res = await fetchFn(tokenEndpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			grant_type: 'authorization_code',
			code: params.code,
			client_id: clientId,
			redirect_uri: redirectUri,
			code_verifier: entry.codeVerifier
		})
	});
	if (!res.ok) return { failure: 'Token-Austausch mit dem IndieAuth-Server fehlgeschlagen.' };

	const body = (await res.json()) as { me?: string };
	if (body.me !== me) return { failure: 'Falsche Identität.' };

	return { redirectTo: entry.redirectTo };
}
