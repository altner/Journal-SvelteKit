const INTERNAL_ORIGIN = 'https://achis.invalid';

export const PROTECTED_PREFIXES = ['/posts/new', '/checkins/new'] as const;

export function isProtectedPath(pathname: string) {
	return PROTECTED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

/** Returns only same-origin path/query/hash targets suitable for a Location header. */
export function safeInternalRedirect(value: string | null | undefined, fallback = '/') {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
		return fallback;
	}

	try {
		const target = new URL(value, INTERNAL_ORIGIN);
		if (target.origin !== INTERNAL_ORIGIN) return fallback;
		return `${target.pathname}${target.search}${target.hash}`;
	} catch {
		return fallback;
	}
}

/** Logout targets must remain reachable after the session has been destroyed. */
export function safePublicRedirect(value: string | null | undefined, fallback = '/') {
	const target = safeInternalRedirect(value, fallback);
	try {
		return isProtectedPath(new URL(target, INTERNAL_ORIGIN).pathname) ? fallback : target;
	} catch {
		return fallback;
	}
}
