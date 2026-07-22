export type WeatherSnapshot = {
	tempC: number;
	code: number;
	windKph: number;
	precipitationMm: number;
};

function utcDateString(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Fetches the historical weather at `lat`/`lon` for the hour closest to `at`, via Open-Meteo's
 *  free Historical Weather (archive) API — no API key, coverage back to 1940. Requested and
 *  matched entirely in UTC (both the API call's `timezone=UTC` and `at`'s own UTC hour) so no
 *  local-timezone conversion is needed on either side.
 *
 *  Best-effort: returns null (never throws) on network errors, a non-OK response, or when the
 *  archive has no data yet for this date — Open-Meteo's ERA5 reanalysis lags ~5 days behind, so
 *  very recent activities legitimately have nothing to fetch yet. Callers should treat a null
 *  result as "try again later", not as a hard failure — see scripts/backfill-weather.mjs, which
 *  re-runs safely over any activity still missing weather data. */
export async function fetchHistoricalWeather(
	lat: number,
	lon: number,
	at: Date
): Promise<WeatherSnapshot | null> {
	const dateStr = utcDateString(at);
	const url = new URL('https://archive-api.open-meteo.com/v1/archive');
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lon));
	url.searchParams.set('start_date', dateStr);
	url.searchParams.set('end_date', dateStr);
	url.searchParams.set('hourly', 'temperature_2m,weathercode,windspeed_10m,precipitation');
	url.searchParams.set('timezone', 'UTC');

	let json: any;
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		json = await res.json();
	} catch {
		return null;
	}

	const times: string[] | undefined = json?.hourly?.time;
	const temps: (number | null)[] | undefined = json?.hourly?.temperature_2m;
	const codes: (number | null)[] | undefined = json?.hourly?.weathercode;
	const winds: (number | null)[] | undefined = json?.hourly?.windspeed_10m;
	const precip: (number | null)[] | undefined = json?.hourly?.precipitation;
	if (!times || !temps || !codes || !winds || !precip) return null;

	const targetHour = `${dateStr}T${String(at.getUTCHours()).padStart(2, '0')}:00`;
	const index = times.indexOf(targetHour);
	if (index === -1) return null;

	const tempC = temps[index];
	const code = codes[index];
	const windKph = winds[index];
	const precipitationMm = precip[index];
	if (tempC == null || code == null || windKph == null || precipitationMm == null) return null;

	return { tempC, code, windKph, precipitationMm };
}
