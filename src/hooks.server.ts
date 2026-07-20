import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';

// Feed, Fotos, Alben und /uploads sind öffentlich lesbar. Nur das Erstellen von Posts
// braucht einen Login.
const PROTECTED_PREFIXES = ['/posts/new'];

// Content-Security-Policy wird nicht hier, sondern über `kit.csp` in vite.config.ts gesetzt -
// SvelteKit generiert dafür einen Nonce für seinen eigenen Inline-Bootstrap-<script> und hängt ihn
// automatisch an script-src an, was von Hand im hook nicht ginge.

export const handle: Handle = async ({ event, resolve }) => {
	const user = await getSessionUser(event.cookies);
	event.locals.user = user;

	const needsAuth = PROTECTED_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix));

	if (!user && needsAuth) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(event.url.pathname)}`);
	}

	if (user && event.url.pathname === '/login') {
		throw redirect(303, '/');
	}

	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
