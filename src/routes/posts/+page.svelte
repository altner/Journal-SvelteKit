<script lang="ts">
	import type { PageData } from './$types';
	import PostCard from '$lib/components/PostCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data }: { data: PageData } = $props();

	let editingId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Beiträge · achis.blog</title>
</svelte:head>

<div class="page feed">
	<h1>Beiträge</h1>

	{#if data.posts.length === 0}
		<p class="empty">Noch keine Beiträge.</p>
	{/if}

	{#each data.posts as p (p.id)}
		<PostCard
			post={p}
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
