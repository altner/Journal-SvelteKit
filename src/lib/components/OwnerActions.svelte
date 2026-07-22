<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, label = 'Aktionen' }: { children: Snippet; label?: string } = $props();
	let open = $state(false);
	let detailsElement: HTMLDetailsElement | undefined = $state();
	let summaryElement: HTMLElement | undefined = $state();

	$effect(() => {
		if (!open || !detailsElement) return;

		function closeFromOutside(event: PointerEvent) {
			if (!detailsElement?.contains(event.target as Node)) open = false;
		}

		function closeFromEscape(event: KeyboardEvent) {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			open = false;
			summaryElement?.focus();
		}

		function closeForAnotherMenu(event: Event) {
			if ((event as CustomEvent<HTMLDetailsElement>).detail !== detailsElement) open = false;
		}

		document.addEventListener('pointerdown', closeFromOutside);
		document.addEventListener('keydown', closeFromEscape);
		document.addEventListener('owner-actions-open', closeForAnotherMenu);
		document.dispatchEvent(new CustomEvent('owner-actions-open', { detail: detailsElement }));

		return () => {
			document.removeEventListener('pointerdown', closeFromOutside);
			document.removeEventListener('keydown', closeFromEscape);
			document.removeEventListener('owner-actions-open', closeForAnotherMenu);
		};
	});
</script>

<details class="owner-actions" bind:this={detailsElement} bind:open>
	<summary bind:this={summaryElement} aria-label={label} aria-expanded={open} title={label}>
		<span aria-hidden="true">•••</span>
	</summary>
	<div class="menu">
		{@render children()}
	</div>
</details>

<style>
	.owner-actions {
		position: relative;
	}

	summary {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		margin: -12px -10px 0 0;
		border-radius: 50%;
		color: var(--fb-gray);
		cursor: pointer;
		list-style: none;
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 1px;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover,
	.owner-actions[open] summary {
		background: var(--fb-hover);
	}

	.menu {
		position: absolute;
		z-index: 30;
		top: 38px;
		right: 0;
		min-width: 150px;
		padding: 6px;
		border: 1px solid var(--fb-border);
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
	}

	.menu :global(button) {
		display: block;
		width: 100%;
		min-height: 44px;
		padding: 8px 10px;
		border-radius: 6px;
		text-align: left;
		white-space: nowrap;
	}

	.menu :global(button:hover) {
		background: var(--fb-hover);
		text-decoration: none;
	}
</style>
