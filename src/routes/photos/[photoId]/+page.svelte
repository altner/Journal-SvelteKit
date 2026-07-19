<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageServerData } from './$types';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';

	let { data }: { data: PageServerData } = $props();

	const photo = $derived(data.photos[data.index]);

	function hrefFor(i: number) {
		return `/photos/${data.photos[i].id}`;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') goto('/photos');
		else if (e.key === 'ArrowRight' && data.photos.length > 1)
			goto(hrefFor((data.index + 1) % data.photos.length));
		else if (e.key === 'ArrowLeft' && data.photos.length > 1)
			goto(hrefFor((data.index - 1 + data.photos.length) % data.photos.length));
	}
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>Foto · achis.blog</title>
</svelte:head>

<PhotoLightbox
	{photo}
	closeHref="/photos"
	prevHref={data.photos.length > 1
		? hrefFor((data.index - 1 + data.photos.length) % data.photos.length)
		: undefined}
	nextHref={data.photos.length > 1 ? hrefFor((data.index + 1) % data.photos.length) : undefined}
/>
