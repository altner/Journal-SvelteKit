<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import type * as LeafletNS from 'leaflet';

	let {
		initialLocation = null,
		startExpanded = false,
		requirePoiName = false,
		onChange
	}: {
		initialLocation?: {
			latitude: number;
			longitude: number;
			locationPlace: string | null;
			locationCountry: string | null;
			locationName: string | null;
			road?: string | null;
			houseNumber?: string | null;
			postcode?: string | null;
		} | null;
		// Forces the picker open from the start even without an initialLocation — used by
		// CheckinComposer, where a location is required and shouldn't be hidden behind a click.
		startExpanded?: boolean;
		// A checkin's title/slug are derived from the POI name (see routes/checkins/new), so it's
		// not just decorative there like it is for a post's optional location — used by
		// CheckinComposer to drop the "(optional)" label and add real `required` validation.
		requirePoiName?: boolean;
		onChange?: () => void;
	} = $props();
	const componentId = $props.id();
	const fieldsId = `${componentId}-fields`;
	const mapHintId = `${componentId}-map-hint`;

	// Only the initial value matters for all of these — later prop changes shouldn't clobber a
	// location the user is actively editing.
	let expanded = $state(untrack(() => initialLocation !== null || startExpanded));
	let mapContainer = $state<HTMLDivElement>();
	let map: LeafletNS.Map | undefined;
	let marker: LeafletNS.Marker | undefined;
	let L: typeof LeafletNS | undefined;

	let latitude = $state<number | null>(untrack(() => initialLocation?.latitude ?? null));
	let longitude = $state<number | null>(untrack(() => initialLocation?.longitude ?? null));
	let locationPlace = $state(untrack(() => initialLocation?.locationPlace ?? ''));
	let locationCountry = $state(untrack(() => initialLocation?.locationCountry ?? ''));
	let locationName = $state(untrack(() => initialLocation?.locationName ?? ''));
	let road = $state(untrack(() => initialLocation?.road ?? ''));
	let houseNumber = $state(untrack(() => initialLocation?.houseNumber ?? ''));
	let postcode = $state(untrack(() => initialLocation?.postcode ?? ''));
	let geocoding = $state(false);
	let locating = $state(false);
	let geocodeError = $state<string | undefined>();
	let errorMessage = $state<HTMLParagraphElement>();
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let geocodeController: AbortController | undefined;
	let locationRequestVersion = 0;

	type PlaceResult = {
		label: string;
		place: string | null;
		country: string | null;
		poiName: string | null;
		road: string | null;
		houseNumber: string | null;
		postcode: string | null;
		latitude: number;
		longitude: number;
	};

	let searchQuery = $state('');
	let searchResults = $state<PlaceResult[]>([]);
	let searching = $state(false);
	let searchError = $state<string | undefined>();
	let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let searchController: AbortController | undefined;

	type NearbyPlace = { name: string; category: string | null; latitude: number; longitude: number };

	let nearbyResults = $state<NearbyPlace[]>([]);
	let nearbyLoading = $state(false);
	let nearbyError = $state<string | undefined>();
	let nearbyDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let nearbyController: AbortController | undefined;

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
				scheduleNearby(pos.lat, pos.lng);
			});
		} else {
			marker.setLatLng([lat, lng]);
		}
		map!.panTo([lat, lng]);
		onChange?.();
		if (triggerGeocode) {
			scheduleGeocode(lat, lng);
			scheduleNearby(lat, lng);
		}
	}

	function scheduleGeocode(lat: number, lng: number) {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => runGeocode(lat, lng), 500);
	}

	function scheduleNearby(lat: number, lng: number) {
		if (nearbyDebounceTimer) clearTimeout(nearbyDebounceTimer);
		nearbyDebounceTimer = setTimeout(() => runNearby(lat, lng), 500);
	}

	async function runNearby(lat: number, lng: number) {
		nearbyController?.abort();
		const controller = new AbortController();
		nearbyController = controller;
		nearbyLoading = true;
		nearbyError = undefined;
		try {
			const res = await fetch(`/api/nearby-places?lat=${lat}&lon=${lng}`, {
				signal: controller.signal
			});
			const data = await res.json();
			if (!res.ok) {
				nearbyError = data.error ?? 'Umgebungssuche fehlgeschlagen.';
				nearbyResults = [];
				return;
			}
			nearbyResults = data as NearbyPlace[];
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			nearbyError = 'Umgebungssuche fehlgeschlagen (Netzwerkfehler).';
			nearbyResults = [];
		} finally {
			if (nearbyController === controller) {
				nearbyLoading = false;
				nearbyController = undefined;
			}
		}
	}

	async function selectNearbyPlace(place: NearbyPlace) {
		// Snap the marker to the POI's own precise node coordinates from Overpass, instead of
		// leaving it at the (potentially tens-of-meters-off) point the user originally clicked —
		// triggerGeocode=true also refreshes place/country/road/etc. for this more accurate point.
		await ensureMap();
		placeMarker(place.latitude, place.longitude, true);
		map?.setView([place.latitude, place.longitude], 17);
		locationName = place.name;
		nearbyResults = [];
		nearbyError = undefined;
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
			road = data.road ?? '';
			houseNumber = data.houseNumber ?? '';
			postcode = data.postcode ?? '';
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

	function scheduleSearch(query: string) {
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		if (!query.trim()) {
			searchController?.abort();
			searchResults = [];
			searching = false;
			searchError = undefined;
			return;
		}
		searchDebounceTimer = setTimeout(() => runSearch(query), 500);
	}

	async function runSearch(query: string) {
		searchController?.abort();
		const controller = new AbortController();
		searchController = controller;
		searching = true;
		searchError = undefined;
		try {
			const res = await fetch(`/api/search-place?q=${encodeURIComponent(query)}`, {
				signal: controller.signal
			});
			const data = await res.json();
			if (!res.ok) {
				searchError = data.error ?? 'Suche fehlgeschlagen.';
				searchResults = [];
				return;
			}
			searchResults = data as PlaceResult[];
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			searchError = 'Suche fehlgeschlagen (Netzwerkfehler).';
			searchResults = [];
		} finally {
			if (searchController === controller) {
				searching = false;
				searchController = undefined;
			}
		}
	}

	async function selectSearchResult(result: PlaceResult) {
		await ensureMap();
		placeMarker(result.latitude, result.longitude, false);
		map?.setView([result.latitude, result.longitude], 16);
		locationPlace = result.place ?? '';
		locationCountry = result.country ?? '';
		road = result.road ?? '';
		houseNumber = result.houseNumber ?? '';
		postcode = result.postcode ?? '';
		// Unlike reverse-geocode's "only fill if empty" rule, an explicitly picked search result
		// always wins — the user just told us exactly which named place this is.
		locationName = result.poiName ?? locationName;
		searchQuery = '';
		searchResults = [];
		searchError = undefined;
		nearbyResults = [];
		nearbyError = undefined;
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
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = undefined;
		searchController?.abort();
		searchController = undefined;
		searching = false;
		searchError = undefined;
		searchQuery = '';
		searchResults = [];
		if (nearbyDebounceTimer) clearTimeout(nearbyDebounceTimer);
		nearbyDebounceTimer = undefined;
		nearbyController?.abort();
		nearbyController = undefined;
		nearbyLoading = false;
		nearbyError = undefined;
		nearbyResults = [];
		latitude = null;
		longitude = null;
		locationPlace = '';
		locationCountry = '';
		locationName = '';
		road = '';
		houseNumber = '';
		postcode = '';
		marker?.remove();
		marker = undefined;
		// Without tearing the map down too, ensureMap()'s `if (map || !mapContainer) return;`
		// guard would skip creating a fresh one bound to the new mapContainer the next time this
		// picker is expanded — the old Leaflet instance is left pointing at a DOM node Svelte
		// already removed, so the map would silently fail to reappear.
		map?.remove();
		map = undefined;
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
			if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
			searchController?.abort();
			if (nearbyDebounceTimer) clearTimeout(nearbyDebounceTimer);
			nearbyController?.abort();
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
			<div class="search-wrap">
				<label>
					Ort suchen
					<input
						type="text"
						value={searchQuery}
						oninput={(e) => {
							searchQuery = e.currentTarget.value;
							scheduleSearch(searchQuery);
						}}
						placeholder="z. B. Café Sibylle Dresden"
						autocomplete="off"
					/>
				</label>
				{#if searching}<p class="hint" aria-live="polite">Suche läuft…</p>{/if}
				{#if searchError}<p class="error" role="alert">{searchError}</p>{/if}
				{#if searchResults.length > 0}
					<ul class="search-results">
						{#each searchResults as result (result.label)}
							<li>
								<button type="button" onclick={() => selectSearchResult(result)}>
									{result.label}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
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
			{#if nearbyLoading}<p class="hint" aria-live="polite">Orte in der Nähe werden gesucht…</p>{/if}
			{#if nearbyError}<p class="error" role="alert">{nearbyError}</p>{/if}
			{#if nearbyResults.length > 0}
				<div class="nearby-wrap">
					<p class="hint">In der Nähe (100m):</p>
					<ul class="search-results">
						{#each nearbyResults as place (`${place.name}-${place.latitude}-${place.longitude}`)}
							<li>
								<button type="button" onclick={() => selectNearbyPlace(place)}>
									{place.name}{#if place.category}<span class="category"> · {place.category}</span>{/if}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
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
				{requirePoiName ? 'Ortsname' : 'POI-Name (optional)'}
				<input
					type="text"
					bind:value={locationName}
					placeholder="z. B. Elbwiesen"
					required={requirePoiName}
				/>
			</label>
			{#if road || postcode}
				<p class="address-display">
					{#if road}{road}{houseNumber ? ` ${houseNumber}` : ''}<br />{/if}
					{#if postcode}{postcode} {locationPlace}{/if}
				</p>
			{/if}
		</div>
	{/if}
</div>

<input type="hidden" name="latitude" value={latitude ?? ''} />
<input type="hidden" name="longitude" value={longitude ?? ''} />
<input type="hidden" name="locationPlace" value={locationPlace} />
<input type="hidden" name="locationCountry" value={locationCountry} />
<input type="hidden" name="locationName" value={locationName} />
<input type="hidden" name="road" value={road} />
<input type="hidden" name="houseNumber" value={houseNumber} />
<input type="hidden" name="postcode" value={postcode} />

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
	.search-wrap {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.search-results {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		overflow: hidden;
	}
	.search-results button {
		align-self: stretch;
		width: 100%;
		border: none;
		border-radius: 0;
		text-align: left;
		font-weight: 400;
		color: #050505;
		white-space: normal;
	}
	.nearby-wrap {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.category {
		color: var(--fb-gray);
		font-weight: 400;
	}
	.address-display {
		margin: 0;
		font-size: 13px;
		color: var(--fb-gray);
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
		/* See TrackMap.svelte — same Leaflet z-index leak onto the fixed/sticky nav chrome. */
		position: relative;
		isolation: isolate;
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
