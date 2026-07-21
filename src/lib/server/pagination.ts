export const PAGE_SIZE = 20;

export type CursorDirection = 'before' | 'after';

export type PageCursor = {
	direction: CursorDirection;
	date: Date;
	id: string;
};

export function readPageCursor(url: URL): PageCursor | null {
	const direction = url.searchParams.has('before')
		? 'before'
		: url.searchParams.has('after')
			? 'after'
			: null;
	if (!direction) return null;

	const raw = url.searchParams.get(direction);
	if (!raw) return null;

	const separator = raw.indexOf('|');
	if (separator < 1) return null;

	const date = new Date(raw.slice(0, separator));
	const id = raw.slice(separator + 1);
	if (Number.isNaN(date.getTime()) || !id) return null;

	return { direction, date, id };
}

export function cursorValue(item: { sortDate: Date; id: string }) {
	return `${item.sortDate.toISOString()}|${item.id}`;
}

export function paginationLinks(
	items: { sortDate: Date; id: string }[],
	direction: CursorDirection | null,
	hasMore: boolean
) {
	if (items.length === 0) return { newer: null, older: null };

	const first = cursorValue(items[0]);
	const last = cursorValue(items.at(-1)!);

	return {
		newer:
			direction === 'before' || (direction === 'after' && hasMore)
				? `?after=${encodeURIComponent(first)}`
				: null,
		older:
			direction === 'after' || hasMore ? `?before=${encodeURIComponent(last)}` : null
	};
}

export function finishPage<T extends { sortDate: Date; id: string }>(
	rows: T[],
	direction: CursorDirection | null
) {
	const hasMore = rows.length > PAGE_SIZE;
	const items = rows.slice(0, PAGE_SIZE);
	if (direction === 'after') items.reverse();
	return { items, pagination: paginationLinks(items, direction, hasMore) };
}
