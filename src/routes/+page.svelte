<script lang="ts">
	import type { PageData } from './$types';
	import PostComposer from '$lib/components/PostComposer.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import ActivityFeedCard from '$lib/components/ActivityFeedCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	let { data }: { data: PageData } = $props();

	let editingId = $state<string | null>(null);
</script>

<svelte:head>
	<title>achis.blog</title>
</svelte:head>

<div class="page feed">
	<h1 class="sr-only">Feed</h1>

	{#if data.user}
		<PostComposer collapsible />
	{/if}

	{#if data.items.length === 0}
		<p class="empty">
			{#if data.user}
				Noch nichts hier. <a href="/posts/new">Erstelle deinen ersten Beitrag</a> oder
				<a href="/activities">lade eine Aktivität hoch</a>.
			{:else}
				Noch keine Beiträge oder Aktivitäten.
			{/if}
		</p>
	{/if}

	{#each data.items as item, index (item.kind === 'post' ? item.post.id : item.activity.id)}
		{#if item.kind === 'post'}
			<PostCard
				post={item.post}
				priority={index === 0}
				user={data.user}
				editing={editingId === item.post.id}
				onEdit={() => (editingId = item.post.id)}
				onEditDone={() => (editingId = null)}
			/>
		{:else}
			<ActivityFeedCard
				activity={item.activity}
				priority={index === 0}
				user={data.user}
				editing={editingId === item.activity.id}
				onEdit={() => (editingId = item.activity.id)}
				onEditDone={() => (editingId = null)}
			/>
		{/if}
	{/each}

	<Pagination pagination={data.pagination} />
</div>

<style>
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
	.empty a {
		color: var(--fb-blue);
		font-weight: 600;
	}
</style>
