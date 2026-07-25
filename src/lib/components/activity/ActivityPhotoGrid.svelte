<script lang="ts">
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import PhotoLightbox from '../photo/PhotoLightbox.svelte';

	type Photo = { id: string; filename: string; originalName?: string | null; width?: number | null; height?: number | null };
	let { photos, activitySlug, priority = false }: { photos: Photo[]; activitySlug: string; priority?: boolean } = $props();

	const shown = $derived(photos.slice(0, 5));
	const extra = $derived(photos.length - shown.length);
	const activePhoto = $derived(photos.find((photo) => photo.id === page.state.lightboxPhotoId));
	const activeIndex = $derived(activePhoto ? photos.indexOf(activePhoto) : -1);

	function hrefFor(photo: Photo) {
		return `/activities/${activitySlug}/photo/${photo.id}`;
	}

	function isPlainClick(event: MouseEvent) {
		return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
	}

	function openPhoto(photo: Photo) {
		return (event: MouseEvent) => {
			if (!isPlainClick(event)) return;
			event.preventDefault();
			pushState(hrefFor(photo), { lightboxPhotoId: photo.id });
		};
	}

	function goToIndex(index: number) {
		const photo = photos[(index + photos.length) % photos.length];
		replaceState(hrefFor(photo), { lightboxPhotoId: photo.id });
	}

	function close() {
		history.back();
	}

	$effect(() => {
		if (!activePhoto) return;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

{#if photos.length === 1}
	<a
		class="single"
		href={hrefFor(photos[0])}
		onclick={openPhoto(photos[0])}
		aria-label="Foto 1 von 1 öffnen"
	>
		<img src="/uploads/{photos[0].filename}" alt="" width={photos[0].width ?? undefined} height={photos[0].height ?? undefined} loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : undefined} decoding="async" />
	</a>
{:else if photos.length > 1}
	<div class="grid count-{shown.length}">
		{#each shown as photo, index (photo.id)}
			<a
				href={hrefFor(photo)}
				onclick={openPhoto(photo)}
				aria-label={`Foto ${index + 1} von ${photos.length} öffnen`}
			>
				<img src="/uploads/{photo.filename}" alt="" width={photo.width ?? undefined} height={photo.height ?? undefined} loading={priority && index === 0 ? 'eager' : 'lazy'} fetchpriority={priority && index === 0 ? 'high' : undefined} decoding="async" />
				{#if extra > 0 && index === shown.length - 1}<span class="more">+{extra}</span>{/if}
			</a>
		{/each}
	</div>
{/if}

{#if activePhoto}
	<PhotoLightbox
		photo={activePhoto}
		closeHref={page.url.pathname}
		prevHref={photos.length > 1 ? hrefFor(photos[(activeIndex - 1 + photos.length) % photos.length]) : undefined}
		nextHref={photos.length > 1 ? hrefFor(photos[(activeIndex + 1) % photos.length]) : undefined}
		onClose={close}
		onPrev={photos.length > 1 ? () => goToIndex(activeIndex - 1) : undefined}
		onNext={photos.length > 1 ? () => goToIndex(activeIndex + 1) : undefined}
	/>
{/if}

<style>
	.single { display: block; }
	.single img { width: 100%; height: auto; display: block; }
	.grid { display: grid; gap: 2px; aspect-ratio: 16 / 10; }
	.grid > a { position: relative; overflow: hidden; display: block; }
	.grid img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.count-2, .count-4 { grid-template-columns: 1fr 1fr; }
	.count-3 { grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; }
	.count-3 > a:first-child { grid-row: 1 / 3; }
	.count-4 { grid-template-rows: 1fr 1fr; aspect-ratio: 1 / 1; }
	.count-5 { grid-template-columns: repeat(6, 1fr); grid-template-rows: 1fr 1fr; }
	.count-5 > a:nth-child(1), .count-5 > a:nth-child(2) { grid-column: span 3; }
	.count-5 > a:nth-child(n+3) { grid-column: span 2; }
	.more { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.55); color: white; font-size: 28px; font-weight: 600; }
</style>
