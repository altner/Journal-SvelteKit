import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, verifyPassword } from '$lib/server/auth';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from '$lib/server/rate-limit';
import { safeInternalRedirect } from '$lib/server/redirect';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = safeInternalRedirect(url.searchParams.get('redirectTo'));
	if (locals.user) throw redirect(303, redirectTo);
	return { redirectTo };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'E-Mail und Passwort werden benötigt.', email });
		}

		const { blocked, retryAfterSeconds } = checkRateLimit(email);
		if (blocked) {
			return fail(429, {
				error: `Zu viele Fehlversuche. Bitte warte ${retryAfterSeconds} Sekunden.`,
				email
			});
		}

		const rows = await db.select().from(user).where(eq(user.email, email));
		const found = rows[0];

		if (!found || !verifyPassword(password, found.passwordHash)) {
			recordFailedAttempt(email);
			return fail(400, { error: 'Login fehlgeschlagen. Bitte prüfe deine Daten.', email });
		}

		recordSuccessfulAttempt(email);
		await createSession(found.id, cookies);

		throw redirect(303, safeInternalRedirect(url.searchParams.get('redirectTo')));
	}
};
