<script lang="ts">
	import type { PageServerData } from './$types';
	import PhotoTabs from '$lib/components/PhotoTabs.svelte';
	let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
	<title>Alben · achis.blog</title>
</svelte:head>

<div class="page">
	<h1>Alben</h1>
	<PhotoTabs />

	{#if data.albums.length === 0}
		<p class="empty">Noch keine Alben. Lade mehrere Fotos in einem Post hoch und aktiviere "als Album speichern".</p>
	{/if}

	<div class="grid">
		{#each data.albums as a (a.id)}
			<a class="card tile" href="/albums/{a.id}">
				{#if a.photos[0]}
					<img src="/uploads/{a.photos[0].filename}" alt="" />
				{:else}
					<div class="placeholder">📁</div>
				{/if}
				<div class="tile-title">{a.title}</div>
			</a>
		{/each}
	</div>
</div>

<style>
	h1 {
		font-size: 20px;
		margin: 0 0 16px 0;
	}
	.empty {
		color: var(--fb-gray);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}
	@media (min-width: 768px) {
		.grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.tile {
		overflow: hidden;
	}
	.tile img,
	.placeholder {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		display: block;
		background: var(--fb-hover);
	}
	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
	}
	.tile-title {
		padding: 8px 10px;
		font-size: 14px;
		font-weight: 600;
	}
</style>
