<script lang="ts">
	import type { PageData } from './$types';
	import PostComposer from '$lib/components/post/PostComposer.svelte';
	import PostCard from '$lib/components/post/PostCard.svelte';
	import ActivityFeedCard from '$lib/components/activity/ActivityFeedCard.svelte';
	import CheckinCard from '$lib/components/checkin/CheckinCard.svelte';
	import Pagination from '$lib/components/shared/Pagination.svelte';
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
				Noch nichts hier. Nutze den Composer oben oder
				<a href="/activities">lade eine Aktivität hoch</a>.
			{:else}
				Noch keine Beiträge oder Aktivitäten.
			{/if}
		</p>
	{/if}

	{#each data.items as item, index (item.kind === 'post' ? item.post.id : item.kind === 'checkin' ? item.checkin.id : item.activity.id)}
		{#if item.kind === 'post'}
			<PostCard
				post={item.post}
				priority={index === 0}
				user={data.user}
				editing={editingId === item.post.id}
				onEdit={() => (editingId = item.post.id)}
				onEditDone={() => (editingId = null)}
			/>
		{:else if item.kind === 'checkin'}
			<CheckinCard
				post={item.checkin}
				priority={index === 0}
				user={data.user}
				editing={editingId === item.checkin.id}
				onEdit={() => (editingId = item.checkin.id)}
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
