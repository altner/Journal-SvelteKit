<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PostCard from '$lib/components/PostCard.svelte';
	let { data }: { data: PageData } = $props();

	let editing = $state(false);

	const headTitle = $derived(`${data.post.title || 'Post'} · achis.blog`);
</script>

<svelte:head>
	<title>{headTitle}</title>
	{#if data.description}<meta name="description" content={data.description} />{/if}
	<link rel="canonical" href={data.canonicalUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={headTitle} />
	{#if data.description}<meta property="og:description" content={data.description} />{/if}
	<meta property="og:url" content={data.canonicalUrl} />
	{#if data.ogImage}<meta property="og:image" content={data.ogImage} />{/if}
	<meta name="twitter:card" content={data.ogImage ? 'summary_large_image' : 'summary'} />
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
