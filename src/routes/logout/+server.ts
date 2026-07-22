import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/auth';
import { safePublicRedirect } from '$lib/server/redirect';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const data = await request.formData();
	const redirectTo = safePublicRedirect(String(data.get('redirectTo') ?? ''));
	await destroySession(cookies);
	throw redirect(303, redirectTo);
};
