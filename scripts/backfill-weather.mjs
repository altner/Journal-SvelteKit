// One-off backfill: fetches historical weather (Open-Meteo archive API, free, no key) for every
// activity that doesn't have it yet, and writes it in. Safe to re-run — only touches rows where
// weather_temp_c is still NULL, so activities Open-Meteo has no data for yet (its ERA5 reanalysis
// lags ~5 days behind "now") are simply skipped and picked up again next run.
//
// Deliberately plain node + raw SQL, not a TS/$lib import (see create-user.mjs) — scripts run
// outside the SvelteKit/vite pipeline, so the archive-API fetch+parse logic here intentionally
// mirrors src/lib/server/weather.ts's fetchHistoricalWeather rather than importing it.
//
// Usage: node --env-file=.env scripts/backfill-weather.mjs
import { createClient } from '@libsql/client';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/backfill-weather.mjs');
	process.exit(1);
}

const client = createClient({ url: process.env.DATABASE_URL });

function utcDateString(d) {
	return d.toISOString().slice(0, 10);
}

async function fetchHistoricalWeather(lat, lon, at) {
	const dateStr = utcDateString(at);
	const url = new URL('https://archive-api.open-meteo.com/v1/archive');
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lon));
	url.searchParams.set('start_date', dateStr);
	url.searchParams.set('end_date', dateStr);
	url.searchParams.set('hourly', 'temperature_2m,weathercode,windspeed_10m,precipitation');
	url.searchParams.set('timezone', 'UTC');

	const res = await fetch(url);
	if (!res.ok) return null;
	const json = await res.json();

	const times = json?.hourly?.time;
	const temps = json?.hourly?.temperature_2m;
	const codes = json?.hourly?.weathercode;
	const winds = json?.hourly?.windspeed_10m;
	const precip = json?.hourly?.precipitation;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const { rows } = await client.execute(
	'select id, track_points, started_at from activity where weather_temp_c is null'
);

console.log(`${rows.length} Aktivität(en) ohne Wetterdaten gefunden.`);

let updated = 0;
let skipped = 0;
let errored = 0;

for (const row of rows) {
	const points = JSON.parse(row.track_points);
	const start = points[0];
	if (!start) {
		console.log(`  ${row.id}: übersprungen (kein Trackpunkt)`);
		skipped++;
		continue;
	}

	// activity.started_at is stored as unix seconds (drizzle's sqlite timestamp mode), not ms —
	// new Date() needs ms, so this must be scaled or every date lands near the 1970 epoch.
	const startedAt = new Date(row.started_at * 1000);
	try {
		const weather = await fetchHistoricalWeather(start[0], start[1], startedAt);
		if (!weather) {
			console.log(`  ${row.id}: übersprungen (noch keine Daten von Open-Meteo — evtl. zu neu)`);
			skipped++;
		} else {
			await client.execute({
				sql: 'update activity set weather_temp_c = ?, weather_code = ?, weather_wind_kph = ?, weather_precipitation_mm = ? where id = ?',
				args: [weather.tempC, weather.code, weather.windKph, weather.precipitationMm, row.id]
			});
			console.log(`  ${row.id}: aktualisiert (${weather.tempC}°C, Code ${weather.code})`);
			updated++;
		}
	} catch (err) {
		console.log(`  ${row.id}: Fehler — ${err instanceof Error ? err.message : err}`);
		errored++;
	}

	// Be nice to the free API.
	await sleep(300);
}

console.log(`Fertig: ${updated} aktualisiert, ${skipped} übersprungen, ${errored} Fehler.`);
process.exit(0);
