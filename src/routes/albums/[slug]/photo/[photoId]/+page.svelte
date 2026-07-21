<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';

	let { data }: { data: PageData } = $props();

	const photos = $derived(data.album.photos);
	const photo = $derived(photos[data.index]);

	function hrefFor(i: number) {
		return `/albums/${data.album.id}/photo/${photos[i].id}`;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') goto(`/albums/${data.album.id}`);
		else if (e.key === 'ArrowRight' && photos.length > 1)
			goto(hrefFor((data.index + 1) % photos.length));
		else if (e.key === 'ArrowLeft' && photos.length > 1)
			goto(hrefFor((data.index - 1 + photos.length) % photos.length));
	}
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>{data.album.title} · achis.blog</title>
</svelte:head>

<PhotoLightbox
	{photo}
	closeHref="/albums/{data.album.id}"
	prevHref={photos.length > 1 ? hrefFor((data.index - 1 + photos.length) % photos.length) : undefined}
	nextHref={photos.length > 1 ? hrefFor((data.index + 1) % photos.length) : undefined}
	deleteAction={data.user ? `/albums/${data.album.id}?/deletePhoto` : undefined}
	onDeleted={() => goto(`/albums/${data.album.id}`)}
/>
