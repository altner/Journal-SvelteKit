<script lang="ts">
	import type { PageServerData } from './$types';
	import PhotoLightbox from '$lib/components/photo/PhotoLightbox.svelte';

	let { data }: { data: PageServerData } = $props();

	const photos = $derived(data.post.photos);
	const photo = $derived(photos[data.index]);
	const headTitle = $derived(`${data.post.title || 'Foto'} · achis.blog`);

	function hrefFor(i: number) {
		return `/posts/${data.post.slug}/photo/${photos[i].id}`;
	}

</script>

<svelte:head>
	<title>{headTitle}</title>
	{#if data.description}<meta name="description" content={data.description} />{/if}
	<link rel="canonical" href={data.canonicalUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={headTitle} />
	{#if data.description}<meta property="og:description" content={data.description} />{/if}
	<meta property="og:url" content={data.canonicalUrl} />
	<meta property="og:image" content={data.ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<PhotoLightbox
	{photo}
	closeHref="/posts/{data.post.slug}"
	prevHref={photos.length > 1 ? hrefFor((data.index - 1 + photos.length) % photos.length) : undefined}
	nextHref={photos.length > 1 ? hrefFor((data.index + 1) % photos.length) : undefined}
/>
