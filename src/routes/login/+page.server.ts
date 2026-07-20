import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, verifyPassword } from '$lib/server/auth';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'E-Mail und Passwort werden benötigt.' });
		}

		const { blocked, retryAfterSeconds } = checkRateLimit(email);
		if (blocked) {
			return fail(429, {
				error: `Zu viele Fehlversuche. Bitte warte ${retryAfterSeconds} Sekunden.`
			});
		}

		const rows = await db.select().from(user).where(eq(user.email, email));
		const found = rows[0];

		if (!found || !verifyPassword(password, found.passwordHash)) {
			recordFailedAttempt(email);
			return fail(400, { error: 'Login fehlgeschlagen. Bitte prüfe deine Daten.' });
		}

		recordSuccessfulAttempt(email);
		await createSession(found.id, cookies);

		const redirectTo = url.searchParams.get('redirectTo');
		throw redirect(303, redirectTo && redirectTo.startsWith('/') ? redirectTo : '/');
	}
};
