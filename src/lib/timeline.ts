export type ClusterablePost = { id: string; createdAt: Date };

export type MonthCluster = {
	year: number;
	month: number; // 1-12
	label: string; // "Juli" — year not repeated, shown as the year heading above it
	anchorId: string; // "post-cluster-2026-07"
	count: number;
};

export type YearGroup = {
	year: number;
	label: string; // "2026"
	months: MonthCluster[];
	count: number;
};

export type ClusterResult = {
	groups: YearGroup[];
	anchorIdByPostId: Map<string, string>; // only the first (newest) post per month gets an entry
};

const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long' });

/** Assumes `posts` is already sorted desc(createdAt) (newest first) — the same order
 *  +page.server.ts's query already guarantees. Relies on that ordering for a single
 *  linear pass rather than re-sorting. */
export function clusterPostsByMonth(posts: ClusterablePost[]): ClusterResult {
	const groups: YearGroup[] = [];
	const anchorIdByPostId = new Map<string, string>();
	let currentYear: YearGroup | undefined;
	let currentMonth: MonthCluster | undefined;

	for (const p of posts) {
		const year = p.createdAt.getFullYear();
		const month = p.createdAt.getMonth() + 1;

		if (!currentYear || currentYear.year !== year) {
			currentYear = { year, label: String(year), months: [], count: 0 };
			groups.push(currentYear);
			currentMonth = undefined;
		}
		if (!currentMonth || currentMonth.month !== month) {
			const anchorId = `post-cluster-${year}-${String(month).padStart(2, '0')}`;
			currentMonth = {
				year,
				month,
				label: monthFormatter.format(new Date(year, month - 1, 1)),
				anchorId,
				count: 0
			};
			currentYear.months.push(currentMonth);
			anchorIdByPostId.set(p.id, anchorId);
		}
		currentMonth.count++;
		currentYear.count++;
	}

	return { groups, anchorIdByPostId };
}
