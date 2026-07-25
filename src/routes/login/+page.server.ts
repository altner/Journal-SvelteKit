import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { safeInternalRedirect } from '$lib/server/redirect';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = safeInternalRedirect(url.searchParams.get('redirectTo'));
	if (locals.user) throw redirect(303, redirectTo);
	return { redirectTo, error: url.searchParams.get('error') };
};
