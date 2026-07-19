<script lang="ts">
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageServerData } from './$types';
	import PhotoTabs from '$lib/components/PhotoTabs.svelte';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';

	let { data }: { data: PageServerData } = $props();

	function hrefFor(photoId: string) {
		return `/photos/${photoId}`;
	}

	function isPlainClick(e: MouseEvent) {
		return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
	}

	function openPhoto(photoId: string) {
		return (e: MouseEvent) => {
			if (!isPlainClick(e)) return;
			e.preventDefault();
			pushState(hrefFor(photoId), { lightboxPhotoId: photoId });
		};
	}

	const activePhoto = $derived(data.photos.find((p) => p.id === page.state.lightboxPhotoId));
	const activeIndex = $derived(activePhoto ? data.photos.indexOf(activePhoto) : -1);

	function goToIndex(i: number) {
		const target = data.photos[(i + data.photos.length) % data.photos.length];
		replaceState(hrefFor(target.id), { lightboxPhotoId: target.id });
	}

	function close() {
		history.back();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!activePhoto) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight' && data.photos.length > 1) goToIndex(activeIndex + 1);
		else if (e.key === 'ArrowLeft' && data.photos.length > 1) goToIndex(activeIndex - 1);
	}

	$effect(() => {
		if (!activePhoto) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>Fotos · achis.blog</title>
</svelte:head>

<div class="page">
	<h1>Fotos</h1>
	<PhotoTabs />

	{#if data.photos.length === 0}
		<p class="empty">Noch keine Fotos.</p>
	{/if}

	<div class="grid">
		{#each data.photos as p (p.id)}
			<a class="tile" href={hrefFor(p.id)} onclick={openPhoto(p.id)}>
				<img src="/uploads/{p.filename}" alt={p.originalName ?? ''} loading="lazy" />
			</a>
		{/each}
	</div>
</div>

{#if activePhoto}
	<PhotoLightbox
		photo={activePhoto}
		closeHref={page.url.pathname}
		prevHref={data.photos.length > 1
			? hrefFor(data.photos[(activeIndex - 1 + data.photos.length) % data.photos.length].id)
			: undefined}
		nextHref={data.photos.length > 1
			? hrefFor(data.photos[(activeIndex + 1) % data.photos.length].id)
			: undefined}
		onClose={close}
		onPrev={data.photos.length > 1 ? () => goToIndex(activeIndex - 1) : undefined}
		onNext={data.photos.length > 1 ? () => goToIndex(activeIndex + 1) : undefined}
	/>
{/if}

<style>
	h1 {
		font-size: 20px;
		margin: 0 0 16px 0;
	}
	.empty {
		color: var(--fb-gray);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
	}
	@media (min-width: 768px) {
		.grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	.tile {
		display: block;
	}
	.tile img {
		width: 100%;
		aspect-ratio: 1 / 1;
		object-fit: cover;
		display: block;
		border-radius: 4px;
	}
</style>
