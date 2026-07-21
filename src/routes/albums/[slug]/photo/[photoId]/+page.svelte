<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';

	let { data }: { data: PageData } = $props();

	const photos = $derived(data.album.photos);
	const photo = $derived(photos[data.index]);
	const headTitle = $derived(`${data.album.title} · achis.blog`);

	function hrefFor(i: number) {
		return `/albums/${data.album.slug}/photo/${photos[i].id}`;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') goto(`/albums/${data.album.slug}`);
		else if (e.key === 'ArrowRight' && photos.length > 1)
			goto(hrefFor((data.index + 1) % photos.length));
		else if (e.key === 'ArrowLeft' && photos.length > 1)
			goto(hrefFor((data.index - 1 + photos.length) % photos.length));
	}
</script>

<svelte:window onkeydown={onKeydown} />

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
	closeHref="/albums/{data.album.slug}"
	prevHref={photos.length > 1 ? hrefFor((data.index - 1 + photos.length) % photos.length) : undefined}
	nextHref={photos.length > 1 ? hrefFor((data.index + 1) % photos.length) : undefined}
	deleteAction={data.user ? `/albums/${data.album.slug}?/deletePhoto` : undefined}
	onDeleted={() => goto(`/albums/${data.album.slug}`)}
/>
