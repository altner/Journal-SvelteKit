import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authorizeMicropubRequest } from '$lib/server/micropubAuth';

// Temporary exploration tool — echoes back whatever a Shortcut sends, so we can see the exact
// field names/types/values without guessing at Shortcuts' Notes-sharing behavior. Delete once
// the Notes-to-post Shortcut is built and the real payload shape is known.
export const POST: RequestHandler = async ({ request }) => {
	console.log('[micropub/debug] request received, content-type:', request.headers.get('content-type'));

	const data = await request.formData();

	try {
		await authorizeMicropubRequest(request, data);
	} catch (e) {
		console.log('[micropub/debug] auth failed:', e);
		throw e;
	}

	const entries = [...data.entries()].map(([key, value]) =>
		value instanceof File
			? { key, type: 'file', name: value.name, size: value.size, mimeType: value.type }
			: { key, type: 'text', value: String(value) }
	);

	console.log('[micropub/debug] entries:', JSON.stringify(entries, null, 2));

	return json({ contentType: request.headers.get('content-type'), entries });
};
