import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { completeLogin } from '$lib/server/indieAuthLogin';
import { createSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

function loginFailure(message: string) {
	return redirect(303, `/login?error=${encodeURIComponent(message)}`);
}

export const GET: RequestHandler = async ({ url, cookies, fetch, locals }) => {
	if (locals.user) throw redirect(303, '/');

	const result = await completeLogin(
		{
			code: url.searchParams.get('code'),
			state: url.searchParams.get('state'),
			error: url.searchParams.get('error'),
			iss: url.searchParams.get('iss')
		},
		fetch
	);

	if ('failure' in result) throw loginFailure(result.failure);

	const ownerEmail = env.MICROPUB_USER_EMAIL;
	if (!ownerEmail) throw loginFailure('MICROPUB_USER_EMAIL ist nicht konfiguriert.');

	const owner = await db.query.user.findFirst({ where: eq(user.email, ownerEmail) });
	if (!owner) throw loginFailure('Kein lokaler Account für diese Identität gefunden.');

	await createSession(owner.id, cookies);
	throw redirect(303, result.redirectTo);
};
