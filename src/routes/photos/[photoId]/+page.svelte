<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PhotoLightbox from '$lib/components/photo/PhotoLightbox.svelte';

	let { data }: { data: PageData } = $props();

	const photo = $derived(data.photos[data.index]);
	const headTitle = $derived(`${data.ogTitle} · achis.blog`);

	function hrefFor(i: number) {
		return `/photos/${data.photos[i].id}`;
	}

</script>

<svelte:head>
	<title>{headTitle}</title>
	<link rel="canonical" href={data.canonicalUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={headTitle} />
	<meta property="og:url" content={data.canonicalUrl} />
	<meta property="og:image" content={data.ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<PhotoLightbox
	{photo}
	origins={photo.origins}
	closeHref="/photos"
	prevHref={data.photos.length > 1
		? hrefFor((data.index - 1 + data.photos.length) % data.photos.length)
		: undefined}
	nextHref={data.photos.length > 1 ? hrefFor((data.index + 1) % data.photos.length) : undefined}
	deleteAction={data.user ? '/photos?/deletePhoto' : undefined}
	onDeleted={() => goto('/photos')}
/>
