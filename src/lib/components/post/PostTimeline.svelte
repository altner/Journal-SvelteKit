<script lang="ts">
	import { untrack } from 'svelte';
	import type { YearGroup } from '$lib/timeline';

	let { clusters }: { clusters: YearGroup[] } = $props();

	// Default to the newest cluster so the timeline doesn't look "empty" before the user
	// has scrolled at all — only the initial value matters here, not reactive to later prop
	// changes (scrolling/the observer take over from here).
	let activeAnchorId = $state<string | null>(
		untrack(() => clusters[0]?.months[0]?.anchorId ?? null)
	);

	function isPlainClick(e: MouseEvent) {
		return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
	}

	function onClusterClick(e: MouseEvent, anchorId: string) {
		if (!isPlainClick(e)) return;
		const el = document.getElementById(anchorId);
		if (!el) return;
		e.preventDefault();
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	$effect(() => {
		const anchorIds = clusters.flatMap((g) => g.months.map((m) => m.anchorId));
		if (anchorIds.length === 0) return;

		const lastAnchorId = anchorIds[anchorIds.length - 1];

		const visible = new Set<string>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const id = (entry.target as HTMLElement).id;
					if (entry.isIntersecting) visible.add(id);
					else visible.delete(id);
				}
				const idsInOrder = anchorIds.filter((id) => visible.has(id));
				if (idsInOrder.length > 0) activeAnchorId = idsInOrder[idsInOrder.length - 1];
			},
			{ rootMargin: '-10% 0px -85% 0px', threshold: 0 }
		);

		for (const id of anchorIds) {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		}

		// The oldest cluster sits at the very end of the feed — if there's not enough content
		// below it to push it up into the detection band above, it never crosses the band and
		// the observer alone would never mark it active. Force it active once the page is
		// scrolled to (or near) the bottom.
		function onScroll() {
			const atBottom =
				window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
			if (atBottom) activeAnchorId = lastAnchorId;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		return () => {
			observer.disconnect();
			window.removeEventListener('scroll', onScroll);
		};
	});
</script>

{#if clusters.length}
	<nav class="post-timeline" aria-label="Zeitleiste">
		{#each clusters as g (g.year)}
			<div class="year-group">
				<a
					href="#{g.months[0].anchorId}"
					class="year-label"
					class:active={activeAnchorId !== null &&
						g.months.some((m) => m.anchorId === activeAnchorId)}
					onclick={(e) => onClusterClick(e, g.months[0].anchorId)}
				>
					{g.label} <span class="count">({g.count})</span>
				</a>
				<ul class="months">
					{#each g.months as m (m.anchorId)}
						<li>
							<a
								href="#{m.anchorId}"
								class:active={activeAnchorId === m.anchorId}
								onclick={(e) => onClusterClick(e, m.anchorId)}
							>
								{m.label} <span class="count">({m.count})</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>
{/if}

<style>
	.post-timeline {
		display: none;
	}
	@media (min-width: 1024px) {
		.post-timeline {
			display: flex;
			flex-direction: column;
			gap: 12px;
			font-size: 14px;
		}
	}
	.year-label {
		display: block;
		font-weight: 700;
		color: #050505;
		margin-bottom: 4px;
		border-radius: 6px;
		padding: 4px 8px;
	}
	.year-label:hover {
		background: var(--fb-hover);
	}
	.year-label.active {
		color: var(--fb-blue);
	}
	.months {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.months a {
		display: block;
		padding: 4px 8px;
		border-radius: 6px;
		color: var(--fb-gray);
	}
	.months a:hover {
		background: var(--fb-hover);
	}
	.months a.active {
		color: var(--fb-blue);
		font-weight: 600;
	}
	.count {
		color: var(--fb-gray);
		font-weight: 400;
		font-size: 12px;
	}
</style>
