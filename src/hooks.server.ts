import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';
import { isProtectedPath, safeInternalRedirect } from '$lib/server/redirect';

// Content-Security-Policy wird nicht hier, sondern über `kit.csp` in vite.config.ts gesetzt -
// SvelteKit generiert dafür einen Nonce für seinen eigenen Inline-Bootstrap-<script> und hängt ihn
// automatisch an script-src an, was von Hand im hook nicht ginge.

// /api/micropub/{checkin,post,media} are meant to be called cross-origin from a browser
// (osm-checkin, the Quill editor, or any future IndieAuth-authenticated Micropub client) — all
// carry no cookies, only a Bearer token, so reflecting the request's Origin back is safe. checkin
// also needs GET here (for ?q=config media-endpoint discovery), not just POST. album stays
// same-origin-only (Apple Shortcut, no browser CORS involved) since no browser client creates
// albums directly.
const CORS_PATHS = ['/api/micropub/checkin', '/api/micropub/post', '/api/micropub/media'];

function isCorsPath(pathname: string) {
	return CORS_PATHS.includes(pathname);
}

function applyCorsHeaders(headers: Headers, origin: string | null) {
	if (!origin) return;
	headers.set('Access-Control-Allow-Origin', origin);
	headers.set('Vary', 'Origin');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	headers.set('Access-Control-Expose-Headers', 'Location');
}

export const handle: Handle = async ({ event, resolve }) => {
	if (isCorsPath(event.url.pathname) && event.request.method === 'OPTIONS') {
		const headers = new Headers();
		applyCorsHeaders(headers, event.request.headers.get('origin'));
		return new Response(null, { status: 204, headers });
	}

	const user = await getSessionUser(event.cookies);
	event.locals.user = user;

	const needsAuth = isProtectedPath(event.url.pathname);

	if (!user && needsAuth) {
		const redirectTo = `${event.url.pathname}${event.url.search}`;
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	if (user && event.url.pathname === '/login') {
		throw redirect(303, safeInternalRedirect(event.url.searchParams.get('redirectTo')));
	}

	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	if (isCorsPath(event.url.pathname)) {
		applyCorsHeaders(response.headers, event.request.headers.get('origin'));
	}

	return response;
};
