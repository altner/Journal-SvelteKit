<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type * as LeafletNS from 'leaflet';

	let { points }: { points: [number, number][] } = $props();

	let mapContainer = $state<HTMLDivElement>();
	let map: LeafletNS.Map | undefined;

	async function ensureMap() {
		if (map || !mapContainer || points.length === 0) return;
		const L = await import('leaflet');

		// Leaflet's default marker icon paths break under Vite bundling — standard fix.
		delete (L.Icon.Default.prototype as any)._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconRetinaUrl: (await import('leaflet/dist/images/marker-icon-2x.png?url')).default,
			iconUrl: (await import('leaflet/dist/images/marker-icon.png?url')).default,
			shadowUrl: (await import('leaflet/dist/images/marker-shadow.png?url')).default
		});

		map = L.map(mapContainer);
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
		}).addTo(map);

		if (points.length === 1) {
			map.setView(points[0], 15);
			L.marker(points[0]).addTo(map);
		} else {
			const line = L.polyline(points, { color: '#1877f2', weight: 4 }).addTo(map);
			L.marker(points[0]).addTo(map);
			L.marker(points[points.length - 1]).addTo(map);
			map.fitBounds(line.getBounds(), { padding: [20, 20] });
		}
	}

	onMount(() => {
		ensureMap();
		return () => map?.remove();
	});
</script>

<div class="track-map" bind:this={mapContainer}></div>

<style>
	.track-map {
		height: 320px;
		border-radius: 6px;
		overflow: hidden;
	}
	@media (min-width: 768px) {
		.track-map {
			height: 420px;
		}
	}
</style>
