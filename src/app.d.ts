// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { YearGroup } from '$lib/timeline';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: { id: string; email: string; displayName: string } | null;
		}
		interface PageData {
			clusters?: YearGroup[];
		}
		interface PageState {
			lightboxPhotoId?: string;
		}
		// interface Platform {}
	}
}

export {};
