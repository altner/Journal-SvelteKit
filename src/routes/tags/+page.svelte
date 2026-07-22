<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Tags · achis.blog</title>
</svelte:head>

<div class="page">
	<h1 class="tag-heading">Tags</h1>

	{#if data.tags.length === 0}
		<p class="empty">Noch keine Tags.</p>
	{/if}

	<div class="tag-list">
		{#each data.tags as t (t.id)}
			<a class="tag-pill" href="/tags/{t.slug}"
				>{t.name}
				<span class="count">{t.count} {t.count === 1 ? 'Eintrag' : 'Einträge'}</span></a
			>
		{/each}
	</div>
</div>

<style>
	.tag-heading {
		font-size: 20px;
		margin: 0 0 16px 0;
	}
	.empty {
		text-align: center;
		color: var(--fb-gray);
		margin-top: 40px;
	}
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.tag-pill {
		background: var(--fb-hover);
		color: var(--fb-blue);
		font-size: 14px;
		font-weight: 600;
		min-height: 44px;
		padding: 8px 14px;
		border-radius: 22px;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.tag-pill:hover {
		background: var(--fb-border);
	}
	.count {
		color: var(--fb-gray);
		font-weight: 400;
		font-size: 12px;
	}
</style>
