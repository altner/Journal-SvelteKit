// Client-safe (no $lib/server import) — used by both the archive list cards and the detail page.
type Sport = 'running' | 'cycling' | 'hiking' | 'walking' | 'other';

const SPORT_ICON: Record<Sport, string> = {
	running: '🏃',
	cycling: '🚴',
	hiking: '🥾',
	walking: '🚶',
	other: '📍'
};

export function sportIcon(sport: string): string {
	return SPORT_ICON[sport as Sport] ?? SPORT_ICON.other;
}

export function formatDistance(meters: number): string {
	return `${(meters / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function formatDuration(totalSeconds: number): string {
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = Math.floor(totalSeconds % 60);
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${m}:${String(s).padStart(2, '0')} Min`;
}

export function formatElevation(meters: number | null): string | null {
	if (meters == null) return null;
	return `↗ ${Math.round(meters)} Hm`;
}

/** "5,2 km · 32:14 Min · ↗ 25 Hm" — used for both card subtitles and og:description. */
export function formatActivitySummary(a: {
	distanceMeters: number;
	durationSeconds: number;
	elevationGainMeters: number | null;
}): string {
	const parts = [formatDistance(a.distanceMeters), formatDuration(a.durationSeconds)];
	const elevation = formatElevation(a.elevationGainMeters);
	if (elevation) parts.push(elevation);
	return parts.join(' · ');
}
