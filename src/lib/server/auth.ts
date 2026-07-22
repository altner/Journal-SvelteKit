import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';
import { session, user } from './db/schema';
import { eq } from 'drizzle-orm';

const SESSION_COOKIE = 'session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------- Password hashing (scrypt, no native deps) ----------

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const derived = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, key] = stored.split(':');
	if (!salt || !key) return false;
	const derived = scryptSync(password, salt, 64);
	const keyBuffer = Buffer.from(key, 'hex');
	if (derived.length !== keyBuffer.length) return false;
	return timingSafeEqual(derived, keyBuffer);
}

// ---------- Sessions ----------

function generateSessionId(): string {
	return randomBytes(32).toString('hex');
}

export async function createSession(userId: string, cookies: Cookies) {
	const id = generateSessionId();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await db.insert(session).values({ id, userId, expiresAt });

	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt
	});

	return id;
}

export async function getSessionUser(cookies: Cookies) {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (!sessionId) return null;

	const rows = await db
		.select({
			userId: user.id,
			email: user.email,
			displayName: user.displayName,
			expiresAt: session.expiresAt
		})
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, sessionId));

	const row = rows[0];
	if (!row) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	if (row.expiresAt.getTime() < Date.now()) {
		await db.delete(session).where(eq(session.id, sessionId));
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	return { id: row.userId, email: row.email, displayName: row.displayName };
}

export async function destroySession(cookies: Cookies) {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (sessionId) {
		await db.delete(session).where(eq(session.id, sessionId));
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
