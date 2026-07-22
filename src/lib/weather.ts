// Client-safe (no $lib/server import) — used by both activity cards and the detail page.
// WMO weather interpretation codes, as returned by Open-Meteo (lib/server/weather.ts fetches
// them). https://open-meteo.com/en/docs -> "WMO Weather interpretation codes".
const WMO: Record<number, { icon: string; label: string }> = {
	0: { icon: '☀️', label: 'Klarer Himmel' },
	1: { icon: '🌤️', label: 'Überwiegend klar' },
	2: { icon: '⛅', label: 'Teilweise bewölkt' },
	3: { icon: '☁️', label: 'Bedeckt' },
	45: { icon: '🌫️', label: 'Nebel' },
	48: { icon: '🌫️', label: 'Reifnebel' },
	51: { icon: '🌦️', label: 'Leichter Nieselregen' },
	53: { icon: '🌦️', label: 'Nieselregen' },
	55: { icon: '🌦️', label: 'Starker Nieselregen' },
	56: { icon: '🌧️', label: 'Gefrierender Nieselregen' },
	57: { icon: '🌧️', label: 'Starker gefrierender Nieselregen' },
	61: { icon: '🌧️', label: 'Leichter Regen' },
	63: { icon: '🌧️', label: 'Regen' },
	65: { icon: '🌧️', label: 'Starker Regen' },
	66: { icon: '🌧️', label: 'Gefrierender Regen' },
	67: { icon: '🌧️', label: 'Starker gefrierender Regen' },
	71: { icon: '❄️', label: 'Leichter Schneefall' },
	73: { icon: '❄️', label: 'Schneefall' },
	75: { icon: '❄️', label: 'Starker Schneefall' },
	77: { icon: '❄️', label: 'Schneegriesel' },
	80: { icon: '🌦️', label: 'Leichte Regenschauer' },
	81: { icon: '🌦️', label: 'Regenschauer' },
	82: { icon: '🌧️', label: 'Heftige Regenschauer' },
	85: { icon: '🌨️', label: 'Leichte Schneeschauer' },
	86: { icon: '🌨️', label: 'Starke Schneeschauer' },
	95: { icon: '⛈️', label: 'Gewitter' },
	96: { icon: '⛈️', label: 'Gewitter mit Hagel' },
	99: { icon: '⛈️', label: 'Schweres Gewitter mit Hagel' }
};

export function weatherIcon(code: number | null): string {
	return code != null ? (WMO[code]?.icon ?? '🌡️') : '🌡️';
}

export function weatherLabel(code: number | null): string {
	return code != null ? (WMO[code]?.label ?? 'Wetter') : 'Wetter';
}

export function formatTemperature(celsius: number): string {
	return `${Math.round(celsius)}°C`;
}

export function formatWind(kph: number): string {
	return `${Math.round(kph)} km/h`;
}

export function formatPrecipitation(mm: number): string {
	return `${mm.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mm`;
}

/** "☀️ Klarer Himmel, 18°C · 💨 12 km/h · 🌧️ 0 mm" — used for both card/detail display and
 *  og:description. Returns null when no weather data is present (not yet fetched). */
export function formatWeatherSummary(a: {
	weatherTempC: number | null;
	weatherCode: number | null;
	weatherWindKph: number | null;
	weatherPrecipitationMm: number | null;
}): string | null {
	if (a.weatherTempC == null) return null;
	const parts = [`${weatherIcon(a.weatherCode)} ${weatherLabel(a.weatherCode)}, ${formatTemperature(a.weatherTempC)}`];
	if (a.weatherWindKph != null) parts.push(`💨 ${formatWind(a.weatherWindKph)}`);
	if (a.weatherPrecipitationMm != null) parts.push(`🌧️ ${formatPrecipitation(a.weatherPrecipitationMm)}`);
	return parts.join(' · ');
}
