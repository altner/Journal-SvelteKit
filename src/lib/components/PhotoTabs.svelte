<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/photos', label: 'Fotos' },
		{ href: '/albums', label: 'Alben' }
	];
</script>

<nav class="tabs">
	{#each tabs as tab (tab.href)}
		<a href={tab.href} class:active={page.url.pathname === tab.href}>{tab.label}</a>
	{/each}
</nav>

<style>
	.tabs {
		display: flex;
		gap: 4px;
		border-bottom: 1px solid var(--fb-border);
		margin-bottom: 16px;
	}
	.tabs a {
		padding: 10px 16px;
		font-size: 14px;
		font-weight: 600;
		color: var(--fb-gray);
		border-bottom: 2px solid transparent;
	}
	.tabs a.active {
		color: var(--fb-blue);
		border-bottom-color: var(--fb-blue);
	}
</style>
