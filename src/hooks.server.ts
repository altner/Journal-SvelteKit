import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';

// Feed, Fotos, Alben und /uploads sind öffentlich lesbar. Nur das Erstellen von Posts
// braucht einen Login.
const PROTECTED_PREFIXES = ['/posts/new'];

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

	return resolve(event);
};
