<script lang="ts">
	import type { PageData } from './$types';
	import PostCard from '$lib/components/PostCard.svelte';
	let { data }: { data: PageData } = $props();

	let editingId = $state<string | null>(null);
</script>

<svelte:head>
	<title>#{data.tag.name} · achis.blog</title>
</svelte:head>

<div class="page feed">
	<a class="back" href="/tags">← Alle Tags</a>
	<h1 class="tag-heading">#{data.tag.name}</h1>

	{#if data.posts.length === 0}
		<p class="empty">Keine Posts mit diesem Tag.</p>
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
</div>

<style>
	.feed {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.back {
		font-size: 13px;
		color: var(--fb-gray);
	}
	.tag-heading {
		font-size: 20px;
		margin: 0;
	}
	.empty {
		text-align: center;
		color: var(--fb-gray);
		margin-top: 40px;
	}
</style>
