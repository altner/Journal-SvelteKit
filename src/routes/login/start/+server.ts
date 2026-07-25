import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startLogin } from '$lib/server/indieAuthLogin';
import { safeInternalRedirect } from '$lib/server/redirect';

export const GET: RequestHandler = async ({ locals, url }) => {
	const redirectTo = safeInternalRedirect(url.searchParams.get('redirectTo'));
	if (locals.user) throw redirect(303, redirectTo);

	const { url: authorizeUrl } = startLogin(redirectTo);
	throw redirect(303, authorizeUrl);
};
