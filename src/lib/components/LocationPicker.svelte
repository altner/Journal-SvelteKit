<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type * as LeafletNS from 'leaflet';

	let {
		initialLocation = null,
		onChange
	}: {
		initialLocation?: {
			latitude: number;
			longitude: number;
			locationPlace: string | null;
			locationCountry: string | null;
			locationName: string | null;
		} | null;
		onChange?: () => void;
	} = $props();
	const componentId = $props.id();
	const fieldsId = `${componentId}-fields`;
	const mapHintId = `${componentId}-map-hint`;

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
	let locating = $state(false);
	let geocodeError = $state<string | undefined>();
	let errorMessage = $state<HTMLParagraphElement>();
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let geocodeController: AbortController | undefined;
	let locationRequestVersion = 0;

	async function showError(message: string) {
		geocodeError = message;
		await tick();
		errorMessage?.focus();
	}

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
		map = L.map(mapContainer, { scrollWheelZoom: false }).setView(
			[startLat, startLng],
			latitude != null ? 15 : 6
		);
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
		onChange?.();
		if (triggerGeocode) scheduleGeocode(lat, lng);
	}

	function scheduleGeocode(lat: number, lng: number) {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => runGeocode(lat, lng), 500);
	}

	async function runGeocode(lat: number, lng: number) {
		geocodeController?.abort();
		const controller = new AbortController();
		geocodeController = controller;
		geocoding = true;
		geocodeError = undefined;
		try {
			const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lng}`, {
				signal: controller.signal
			});
			const data = await res.json();
			if (!res.ok) {
				await showError(data.error ?? 'Ortsermittlung fehlgeschlagen.');
				return;
			}
			locationPlace = data.place ?? '';
			locationCountry = data.country ?? '';
			// Only auto-fill if empty, so a re-geocode after dragging doesn't clobber a name the
			// user already typed/edited by hand.
			if (!locationName && data.poiName) locationName = data.poiName;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			await showError('Ortsermittlung fehlgeschlagen (Netzwerkfehler).');
		} finally {
			if (geocodeController === controller) {
				geocoding = false;
				geocodeController = undefined;
			}
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
			void showError('Die Standortermittlung wird von diesem Browser nicht unterstützt.');
			return;
		}
		const requestVersion = ++locationRequestVersion;
		locating = true;
		geocodeError = undefined;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				if (requestVersion !== locationRequestVersion || !expanded) return;
				locating = false;
				placeMarker(pos.coords.latitude, pos.coords.longitude, true);
				map?.setView([pos.coords.latitude, pos.coords.longitude], 15);
			},
			() => {
				if (requestVersion !== locationRequestVersion || !expanded) return;
				locating = false;
				void showError(
					'Der Standort konnte nicht ermittelt werden. Prüfe die Browser-Berechtigung oder wähle ihn auf der Karte aus.'
				);
			}
		);
	}

	function clearLocation() {
		const hadLocation = latitude != null || longitude != null || locationPlace || locationCountry || locationName;
		locationRequestVersion += 1;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = undefined;
		geocodeController?.abort();
		geocodeController = undefined;
		locating = false;
		geocoding = false;
		geocodeError = undefined;
		latitude = null;
		longitude = null;
		locationPlace = '';
		locationCountry = '';
		locationName = '';
		marker?.remove();
		marker = undefined;
		expanded = false;
		if (hadLocation) onChange?.();
	}

	export function reset() {
		clearLocation();
	}

	onMount(() => {
		if (expanded) ensureMap();
		return () => {
			locationRequestVersion += 1;
			if (debounceTimer) clearTimeout(debounceTimer);
			geocodeController?.abort();
			map?.remove();
		};
	});
</script>

<div class="location-picker">
	<button
		type="button"
		onclick={toggleExpanded}
		aria-expanded={expanded}
		aria-controls={fieldsId}
	>
		{expanded ? 'Standort entfernen' : '📍 Standort hinzufügen'}
	</button>

	{#if expanded}
		<div id={fieldsId} class="location-fields" aria-busy={locating || geocoding}>
			<p class="map-hint" id={mapHintId}>
				Klicke auf die Karte oder ziehe den Marker, um den Standort festzulegen.
			</p>
			<div
				class="map-container"
				bind:this={mapContainer}
				role="region"
				aria-label="Standort auf der Karte auswählen"
				aria-describedby={mapHintId}
			></div>
			<button type="button" class="secondary" onclick={useMyLocation} disabled={locating}>
				{locating ? 'Standort wird ermittelt…' : '📍 Meinen Standort verwenden'}
			</button>
			{#if geocoding}<p class="hint" aria-live="polite">Ort und Land werden ermittelt…</p>{/if}
			{#if geocodeError}
				<p bind:this={errorMessage} class="error" role="alert" tabindex="-1">{geocodeError}</p>
			{/if}
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
		</div>
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
	.location-fields {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.map-hint {
		margin: 0;
		font-size: 13px;
		color: var(--fb-gray);
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
		min-height: 44px;
		padding: 6px 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--fb-blue);
		cursor: pointer;
	}
	button:hover {
		background: var(--fb-hover);
	}
	button:disabled {
		cursor: wait;
		opacity: 0.65;
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
		min-height: 44px;
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
