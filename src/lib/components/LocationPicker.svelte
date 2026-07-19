<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type * as LeafletNS from 'leaflet';

	let {
		initialLocation = null
	}: {
		initialLocation?: {
			latitude: number;
			longitude: number;
			locationPlace: string | null;
			locationCountry: string | null;
			locationName: string | null;
		} | null;
	} = $props();

	// Only the initial value matters for all of these — later prop changes shouldn't clobber a
	// location the user is actively editing.
	let expanded = $state(untrack(() => initialLocation !== null));
	let mapContainer = $state<HTMLDivElement>();
	let map: LeafletNS.Map | undefined;
	let marker: LeafletNS.Marker | undefined;
	let L: typeof LeafletNS | undefined;

	let latitude = $state<number | null>(untrack(() => initialLocation?.latitude ?? null));
	let longitude = $state<number | null>(untrack(() => initialLocation?.longitude ?? null));
	let locationPlace = $state(untrack(() => initialLocation?.locationPlace ?? ''));
	let locationCountry = $state(untrack(() => initialLocation?.locationCountry ?? ''));
	let locationName = $state(untrack(() => initialLocation?.locationName ?? ''));
	let geocoding = $state(false);
	let geocodeError = $state<string | undefined>();
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	async function ensureMap() {
		if (map || !mapContainer) return;
		L = await import('leaflet');

		// Leaflet's default marker icon paths break under Vite bundling — standard fix.
		delete (L.Icon.Default.prototype as any)._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconRetinaUrl: (await import('leaflet/dist/images/marker-icon-2x.png?url')).default,
			iconUrl: (await import('leaflet/dist/images/marker-icon.png?url')).default,
			shadowUrl: (await import('leaflet/dist/images/marker-shadow.png?url')).default
		});

		const startLat = latitude ?? 51.05;
		const startLng = longitude ?? 13.74; // Dresden fallback center
		map = L.map(mapContainer).setView([startLat, startLng], latitude != null ? 15 : 6);
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
		}).addTo(map);

		if (latitude != null && longitude != null) placeMarker(latitude, longitude, false);
		map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng, true));
	}

	function placeMarker(lat: number, lng: number, triggerGeocode: boolean) {
		latitude = lat;
		longitude = lng;
		if (!marker) {
			marker = L!.marker([lat, lng], { draggable: true }).addTo(map!);
			marker.on('dragend', () => {
				const pos = marker!.getLatLng();
				latitude = pos.lat;
				longitude = pos.lng;
				scheduleGeocode(pos.lat, pos.lng);
			});
		} else {
			marker.setLatLng([lat, lng]);
		}
		map!.panTo([lat, lng]);
		if (triggerGeocode) scheduleGeocode(lat, lng);
	}

	function scheduleGeocode(lat: number, lng: number) {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => runGeocode(lat, lng), 500);
	}

	async function runGeocode(lat: number, lng: number) {
		geocoding = true;
		geocodeError = undefined;
		try {
			const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lng}`);
			const data = await res.json();
			if (!res.ok) {
				geocodeError = data.error ?? 'Ortsermittlung fehlgeschlagen.';
				return;
			}
			locationPlace = data.place ?? '';
			locationCountry = data.country ?? '';
			// Only auto-fill if empty, so a re-geocode after dragging doesn't clobber a name the
			// user already typed/edited by hand.
			if (!locationName && data.poiName) locationName = data.poiName;
		} catch {
			geocodeError = 'Ortsermittlung fehlgeschlagen (Netzwerkfehler).';
		} finally {
			geocoding = false;
		}
	}

	async function toggleExpanded() {
		if (expanded) {
			clearLocation();
			return;
		}
		expanded = true;
		await tick();
		await ensureMap();
		map?.invalidateSize();
	}

	function useMyLocation() {
		if (!navigator.geolocation) {
			geocodeError = 'Geolocation wird nicht unterstützt.';
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				placeMarker(pos.coords.latitude, pos.coords.longitude, true);
				map?.setView([pos.coords.latitude, pos.coords.longitude], 15);
			},
			() => {
				geocodeError = 'Standort konnte nicht ermittelt werden.';
			}
		);
	}

	function clearLocation() {
		latitude = null;
		longitude = null;
		locationPlace = '';
		locationCountry = '';
		locationName = '';
		marker?.remove();
		marker = undefined;
		expanded = false;
	}

	export function reset() {
		clearLocation();
	}

	onMount(() => {
		if (expanded) ensureMap();
		return () => map?.remove();
	});
</script>

<div class="location-picker">
	<button type="button" onclick={toggleExpanded}>
		{expanded ? 'Standort entfernen' : '📍 Standort hinzufügen'}
	</button>

	{#if expanded}
		<div class="map-container" bind:this={mapContainer}></div>
		<button type="button" class="secondary" onclick={useMyLocation}>
			📍 Meinen Standort verwenden
		</button>
		{#if geocoding}<p class="hint">Ort wird ermittelt…</p>{/if}
		{#if geocodeError}<p class="error">{geocodeError}</p>{/if}
		<label>
			Ort
			<input type="text" bind:value={locationPlace} />
		</label>
		<label>
			Land
			<input type="text" bind:value={locationCountry} />
		</label>
		<label>
			POI-Name (optional)
			<input type="text" bind:value={locationName} placeholder="z. B. Elbwiesen" />
		</label>
	{/if}
</div>

<input type="hidden" name="latitude" value={latitude ?? ''} />
<input type="hidden" name="longitude" value={longitude ?? ''} />
<input type="hidden" name="locationPlace" value={locationPlace} />
<input type="hidden" name="locationCountry" value={locationCountry} />
<input type="hidden" name="locationName" value={locationName} />

<style>
	.location-picker {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.map-container {
		height: 260px;
		border-radius: 6px;
		overflow: hidden;
	}
	button {
		align-self: flex-start;
		background: none;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--fb-blue);
		cursor: pointer;
	}
	button:hover {
		background: var(--fb-hover);
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	input[type='text'] {
		padding: 10px 12px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 15px;
		font-family: inherit;
		color: #050505;
	}
	.hint {
		font-size: 13px;
		color: var(--fb-gray);
		margin: 0;
	}
	.error {
		background: #fde2e1;
		color: #b3261e;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		margin: 0;
	}
</style>
