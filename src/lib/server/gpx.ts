import { XMLParser } from 'fast-xml-parser';

export type Sport = 'running' | 'cycling' | 'hiking' | 'walking' | 'other';

export type ParsedTrack = {
	// Full resolution — the caller (activities.ts) downsamples for map rendering; distance/
	// elevation math here always runs against this, never a downsampled copy.
	points: [number, number][];
	elevations: (number | null)[];
	distanceMeters: number;
	// null when there is no usable timestamp anywhere in the file — the caller decides whether
	// to reject the upload in that case.
	durationSeconds: number | null;
	// null when any point in the track is missing <ele> — see schema.ts's comment on
	// activity.elevationGainMeters for why this isn't a best-effort partial sum.
	elevationGainMeters: number | null;
	startedAt: Date | null;
	detectedSport: Sport | null;
};

function toArray<T>(x: T | T[] | undefined): T[] {
	if (x === undefined) return [];
	return Array.isArray(x) ? x : [x];
}

const EARTH_RADIUS_M = 6371000;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SPORT_KEYWORDS: [RegExp, Sport][] = [
	[/run/i, 'running'],
	[/cycl|bik|ride/i, 'cycling'],
	[/hik/i, 'hiking'],
	[/walk/i, 'walking']
];

function detectSport(rawType: unknown): Sport | null {
	if (typeof rawType !== 'string') return null;
	for (const [pattern, sport] of SPORT_KEYWORDS) {
		if (pattern.test(rawType)) return sport;
	}
	return null;
}

/** Parses a GPX file buffer into track points plus derived stats. Concatenates all <trk>/<trkseg>
 *  elements into one continuous point stream (real files from watches with auto-pause routinely
 *  have multiple segments) — duration is elapsed time across the whole thing, including any
 *  auto-pause gaps, not moving time. */
export function parseGpxTrack(buffer: Buffer): ParsedTrack {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
		parseAttributeValue: true
	});

	let doc: any;
	try {
		doc = parser.parse(buffer.toString('utf-8'));
	} catch {
		throw new Error('Datei konnte nicht als GPX gelesen werden.');
	}

	const gpx = doc?.gpx;
	if (!gpx) throw new Error('Keine gültige GPX-Datei.');

	const tracks = toArray(gpx.trk);
	const rawType = tracks.find((t) => t?.type)?.type;

	const points: [number, number][] = [];
	const elevations: (number | null)[] = [];
	const times: (Date | null)[] = [];

	for (const trk of tracks) {
		for (const seg of toArray(trk?.trkseg)) {
			for (const pt of toArray(seg?.trkpt)) {
				if (typeof pt?.lat !== 'number' || typeof pt?.lon !== 'number') continue;
				points.push([pt.lat, pt.lon]);
				elevations.push(typeof pt.ele === 'number' ? pt.ele : null);
				times.push(typeof pt.time === 'string' ? new Date(pt.time) : null);
			}
		}
	}

	if (points.length === 0) throw new Error('GPX-Datei enthält keine Trackpunkte.');

	let distanceMeters = 0;
	for (let i = 1; i < points.length; i++) {
		distanceMeters += haversineMeters(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
	}

	const elevationGainMeters = elevations.every((e) => e !== null)
		? elevations.reduce<number>(
				(sum, e, i) => (i === 0 ? 0 : sum + Math.max(0, e! - elevations[i - 1]!)),
				0
			)
		: null;

	const validTimes = times.filter((t): t is Date => t !== null);
	const startedAt = validTimes[0] ?? null;
	const durationSeconds =
		validTimes.length >= 2
			? Math.round(
					(validTimes[validTimes.length - 1].getTime() - validTimes[0].getTime()) / 1000
				)
			: null;

	return {
		points,
		elevations,
		distanceMeters,
		durationSeconds,
		elevationGainMeters,
		startedAt,
		detectedSport: detectSport(rawType)
	};
}
