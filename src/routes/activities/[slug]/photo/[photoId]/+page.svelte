<script lang="ts">
	import type { PageServerData } from './$types';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';

	let { data }: { data: PageServerData } = $props();
	const photos = $derived(data.activity.photos);
	const photo = $derived(photos[data.index]);
	const headTitle = $derived(`${data.activity.title} · achis.blog`);

	function hrefFor(index: number) {
		return `/activities/${data.activity.slug}/photo/${photos[index].id}`;
	}

</script>

<svelte:head>
	<title>{headTitle}</title>
	<meta name="description" content={data.description} />
	<link rel="canonical" href={data.canonicalUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={headTitle} />
	<meta property="og:description" content={data.description} />
	<meta property="og:url" content={data.canonicalUrl} />
	<meta property="og:image" content={data.ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<PhotoLightbox
	{photo}
	closeHref="/activities/{data.activity.slug}"
	prevHref={photos.length > 1 ? hrefFor((data.index - 1 + photos.length) % photos.length) : undefined}
	nextHref={photos.length > 1 ? hrefFor((data.index + 1) % photos.length) : undefined}
/>
