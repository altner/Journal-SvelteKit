<script lang="ts">
	import type { PageData } from './$types';
	import CheckinCard from '$lib/components/checkin/CheckinCard.svelte';
	import Pagination from '$lib/components/shared/Pagination.svelte';
	let { data }: { data: PageData } = $props();

	let editingId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Checkins · achis.blog</title>
</svelte:head>

<div class="page feed">
	<h1>Checkins</h1>

	{#if data.posts.length === 0}
		<p class="empty">Noch keine Checkins.</p>
	{/if}

	{#each data.posts as p, index (p.id)}
		<CheckinCard
			post={p}
			priority={index === 0}
			user={data.user}
			editing={editingId === p.id}
			onEdit={() => (editingId = p.id)}
			onEditDone={() => (editingId = null)}
		/>
	{/each}

	<Pagination pagination={data.pagination} />
</div>

<style>
	h1 {
		font-size: 20px;
		margin: 0 0 16px 0;
	}
	.feed {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.empty {
		text-align: center;
		color: var(--fb-gray);
		margin-top: 40px;
	}
</style>
