<script lang="ts">
	import type { PageData } from './$types';
	import PostCard from '$lib/components/PostCard.svelte';
	import ActivityFeedCard from '$lib/components/ActivityFeedCard.svelte';
	let { data }: { data: PageData } = $props();

	let editingId = $state<string | null>(null);
</script>

<svelte:head>
	<title>#{data.tag.name} · achis.blog</title>
</svelte:head>

<div class="page feed">
	<a class="back" href="/tags">← Alle Tags</a>
	<h1 class="tag-heading">#{data.tag.name}</h1>

	{#if data.items.length === 0}
		<p class="empty">Nichts mit diesem Tag.</p>
	{/if}

	{#each data.items as item (item.kind === 'post' ? item.post.id : item.activity.id)}
		{#if item.kind === 'post'}
			<PostCard
				post={item.post}
				user={data.user}
				editing={editingId === item.post.id}
				onEdit={() => (editingId = item.post.id)}
				onEditDone={() => (editingId = null)}
			/>
		{:else}
			<ActivityFeedCard
				activity={item.activity}
				user={data.user}
				editing={editingId === item.activity.id}
				onEdit={() => (editingId = item.activity.id)}
				onEditDone={() => (editingId = null)}
			/>
		{/if}
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
