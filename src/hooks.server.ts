import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';
import { isProtectedPath, safeInternalRedirect } from '$lib/server/redirect';

// Content-Security-Policy wird nicht hier, sondern über `kit.csp` in vite.config.ts gesetzt -
// SvelteKit generiert dafür einen Nonce für seinen eigenen Inline-Bootstrap-<script> und hängt ihn
// automatisch an script-src an, was von Hand im hook nicht ginge.

export const handle: Handle = async ({ event, resolve }) => {
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

	return response;
};
