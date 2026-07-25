<script lang="ts">
	import { pushState, replaceState, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import PhotoTabs from '$lib/components/photo/PhotoTabs.svelte';
	import PhotoLightbox from '$lib/components/photo/PhotoLightbox.svelte';
	import JustifiedGallery from '$lib/components/photo/JustifiedGallery.svelte';
	import Pagination from '$lib/components/shared/Pagination.svelte';

	let { data }: { data: PageData } = $props();

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

	async function handlePhotoDeleted() {
		const deletedIndex = activeIndex;
		await invalidateAll();
		if (data.photos.length === 0) {
			close();
			return;
		}
		goToIndex(deletedIndex);
	}

	$effect(() => {
		if (!activePhoto) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:head>
	<title>Fotos · achis.blog</title>
</svelte:head>

<div class="page">
	<h1>Fotos</h1>
	<PhotoTabs />

	{#if data.photos.length === 0}
		<p class="empty">Noch keine Fotos.</p>
	{:else}
		<JustifiedGallery items={data.photos}>
			{#snippet children(p)}
				<a
					class="tile"
					href={hrefFor(p.id)}
					onclick={openPhoto(p.id)}
					aria-label={p.originalName ? `Foto ${p.originalName} öffnen` : 'Foto öffnen'}
				>
					<img
						src="/uploads/{p.filename}"
						alt={p.originalName ?? ''}
						width={p.width ?? undefined}
						height={p.height ?? undefined}
						loading={p === data.photos[0] ? 'eager' : 'lazy'}
						fetchpriority={p === data.photos[0] ? 'high' : undefined}
						decoding="async"
					/>
				</a>
			{/snippet}
		</JustifiedGallery>
	{/if}

	<Pagination pagination={data.pagination} />
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
		deleteAction={data.user ? '/photos?/deletePhoto' : undefined}
		onDeleted={handlePhotoDeleted}
		origins={activePhoto.origins}
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
	.tile {
		display: block;
		width: 100%;
		height: 100%;
	}
	.tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		border-radius: 4px;
	}
</style>
