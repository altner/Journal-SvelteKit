<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PostCard from '$lib/components/PostCard.svelte';
	let { data }: { data: PageData } = $props();

	let editing = $state(false);
</script>

<svelte:head>
	<title>{data.post.title || 'Post'} · achis.blog</title>
</svelte:head>

<div class="page">
	<a class="back" href="/">← Zum Feed</a>

	<PostCard
		post={data.post}
		user={data.user}
		{editing}
		onEdit={() => (editing = true)}
		onEditDone={() => (editing = false)}
		afterDelete={() => goto('/')}
	/>
</div>

<style>
	.back {
		font-size: 13px;
		color: var(--fb-gray);
		display: inline-block;
		margin-bottom: 12px;
	}
</style>
