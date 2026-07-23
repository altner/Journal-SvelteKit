/** Takes the optional "date"/"time" fields a composer submits (YYYY-MM-DD / HH:MM, e.g. for
 *  backdating older photos) and combines them into a single Date. No valid date: now. Date but no
 *  valid time: current time (fallback), so multiple same-day backdated entries still sort in
 *  submission order. Shared between routes/posts/new and routes/checkins/new. */
export function resolveCreatedAt(dateInput: string, timeInput: string): Date {
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
	const now = new Date();
	if (!dateMatch) return now;

	const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeInput);
	const [hours, minutes] = timeMatch
		? [Number(timeMatch[1]), Number(timeMatch[2])]
		: [now.getHours(), now.getMinutes()];

	const [, year, month, day] = dateMatch;
	const combined = new Date(
		Number(year),
		Number(month) - 1,
		Number(day),
		hours,
		minutes,
		now.getSeconds(),
		now.getMilliseconds()
	);
	return Number.isNaN(combined.getTime()) ? now : combined;
}
