// In-memory brute-force throttle for the login action. A single Node process backs this whole
// app (no clustering), so a plain Map is enough - no need for a shared store like Redis.

type Entry = { failCount: number; blockedUntil: number };

const attempts = new Map<string, Entry>();

const FREE_ATTEMPTS = 2; // first couple of failures don't block - typos happen
const BASE_BLOCK_MS = 1000;
const MAX_BLOCK_MS = 60_000;

export function checkRateLimit(key: string): { blocked: boolean; retryAfterSeconds: number } {
	const entry = attempts.get(key);
	if (!entry) return { blocked: false, retryAfterSeconds: 0 };

	const remainingMs = entry.blockedUntil - Date.now();
	if (remainingMs <= 0) return { blocked: false, retryAfterSeconds: 0 };

	return { blocked: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}

export function recordFailedAttempt(key: string): void {
	const entry = attempts.get(key) ?? { failCount: 0, blockedUntil: 0 };
	entry.failCount++;

	if (entry.failCount > FREE_ATTEMPTS) {
		const backoffMs = Math.min(
			BASE_BLOCK_MS * 2 ** (entry.failCount - FREE_ATTEMPTS - 1),
			MAX_BLOCK_MS
		);
		entry.blockedUntil = Date.now() + backoffMs;
	}

	attempts.set(key, entry);
}

export function recordSuccessfulAttempt(key: string): void {
	attempts.delete(key);
}
