<script module lang="ts">
	export type JustifiedItem = {
		id: string;
		width: number | null;
		height: number | null;
	};
</script>

<script lang="ts" generics="T extends JustifiedItem">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { computeLayout } from '@altner/astro-justified-gallery-layout';

	let {
		items,
		children,
		targetRowHeight = 190,
		gap = 4
	}: {
		items: T[];
		children: Snippet<[T]>;
		targetRowHeight?: number;
		gap?: number;
	} = $props();

	let root: HTMLDivElement;
	let containerWidth = $state(0);

	const layout = $derived(
		computeLayout(
			items.map((item) => ({ w: item.width ?? 4, h: item.height ?? 3 })),
			{ containerWidth, targetRowHeight, gap }
		)
	);

	onMount(() => {
		let frame = 0;
		const observer = new ResizeObserver(([entry]) => {
			const nextWidth = entry.contentRect.width;
			if (Math.abs(containerWidth - nextWidth) < 0.5) return;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				containerWidth = nextWidth;
			});
		});
		observer.observe(root);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});
</script>

<div
	bind:this={root}
	class="justified-gallery"
	class:ready={containerWidth > 0}
	style:height={`${layout.totalHeight}px`}
>
	{#each items as item, index (item.id)}
		{@const box = layout.boxes[index]}
		<div
			class="justified-item"
			style:left={box ? `${box.left}px` : undefined}
			style:top={box ? `${box.top}px` : undefined}
			style:width={box ? `${box.width}px` : undefined}
			style:height={box ? `${box.height}px` : undefined}
		>
			{@render children(item)}
		</div>
	{/each}
</div>

<style>
	.justified-gallery {
		position: relative;
		width: 100%;
		min-height: 1px;
	}
	.justified-item {
		position: absolute;
		overflow: hidden;
	}
	.justified-item :global(> *) {
		width: 100%;
		height: 100%;
	}
</style>
