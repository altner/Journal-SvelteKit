import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			},
			// SvelteKit's built-in CSRF check blocks cross-site form-content-type POSTs (multipart/
			// form-data, x-www-form-urlencoded) before `handle` even runs, regardless of the CORS
			// headers set there — it protects cookie-based session routes, but /api/micropub/post and
			// /api/micropub/media authenticate via Bearer token only, so they need an explicit
			// trusted-origin exemption. /api/micropub/checkin itself isn't affected (JSON body, not
			// form-content-type) but its ?q=config GET is same-origin-check-exempt anyway (CSRF only
			// applies to state-changing methods) — only the media upload needed adding here.
			csrf: {
				trustedOrigins: ['https://quill.altner.cloud', 'https://osm-checkin.altner.cloud']
			},
			// SvelteKit generates a per-request nonce for its own inline bootstrap <script> (and any
			// inline <style> from Svelte transitions) and adds it to these directives automatically -
			// that's why script-src can stay strict here without 'unsafe-inline', unlike a hand-rolled
			// CSP header. style-src still needs 'unsafe-inline': Vite's dev server injects HMR CSS via
			// inline <style> elements that SvelteKit's nonce machinery doesn't cover, and Svelte
			// transitions do the same in production - see the `csp` config docs. The only external
			// origin needed anywhere is tile.openstreetmap.org (Leaflet map tiles in LocationPicker);
			// Nominatim is only ever called server-side (api/reverse-geocode), so it never appears here.
			csp: {
				mode: 'auto',
				directives: {
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'https://tile.openstreetmap.org'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'frame-ancestors': ['none'],
					'form-action': ['self']
				}
			}
		})
	],
	ssr: {
		// @libsql/client ships platform-specific native bindings that must not be
		// bundled by Rollup — keep it as a real runtime dependency instead.
		external: ['@libsql/client']
	}
});
