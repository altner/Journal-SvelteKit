<script lang="ts">
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import PhotoLightbox from './PhotoLightbox.svelte';

	type Photo = { id: string; filename: string; postId: string };
	let { photos }: { photos: Photo[] } = $props();

	const shown = $derived(photos.slice(0, 5));
	const extra = $derived(photos.length - shown.length);

	function hrefFor(photo: Photo) {
		return `/posts/${photo.postId}/photo/${photo.id}`;
	}

	function isPlainClick(e: MouseEvent) {
		return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
	}

	function openPhoto(photo: Photo) {
		return (e: MouseEvent) => {
			if (!isPlainClick(e)) return;
			e.preventDefault();
			pushState(hrefFor(photo), { lightboxPhotoId: photo.id });
		};
	}

	const activePhoto = $derived(photos.find((p) => p.id === page.state.lightboxPhotoId));
	const activeIndex = $derived(activePhoto ? photos.indexOf(activePhoto) : -1);

	function goToIndex(i: number) {
		const target = photos[(i + photos.length) % photos.length];
		replaceState(hrefFor(target), { lightboxPhotoId: target.id });
	}

	function close() {
		history.back();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!activePhoto) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight' && photos.length > 1) goToIndex(activeIndex + 1);
		else if (e.key === 'ArrowLeft' && photos.length > 1) goToIndex(activeIndex - 1);
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

{#if photos.length === 1}
	<a class="single-link" href={hrefFor(photos[0])} onclick={openPhoto(photos[0])}>
		<img class="single" src="/uploads/{photos[0].filename}" alt="" />
	</a>
{:else if photos.length > 1}
	<div class="grid n{shown.length}">
		{#each shown as photo, i (photo.id)}
			<a class="tile" href={hrefFor(photo)} onclick={openPhoto(photo)}>
				<img src="/uploads/{photo.filename}" alt="" />
				{#if extra > 0 && i === shown.length - 1}
					<div class="more">+{extra}</div>
				{/if}
			</a>
		{/each}
	</div>
{/if}

{#if activePhoto}
	<PhotoLightbox
		photo={activePhoto}
		closeHref={page.url.pathname}
		prevHref={photos.length > 1
			? hrefFor(photos[(activeIndex - 1 + photos.length) % photos.length])
			: undefined}
		nextHref={photos.length > 1
			? hrefFor(photos[(activeIndex + 1) % photos.length])
			: undefined}
		onClose={close}
		onPrev={photos.length > 1 ? () => goToIndex(activeIndex - 1) : undefined}
		onNext={photos.length > 1 ? () => goToIndex(activeIndex + 1) : undefined}
	/>
{/if}

<style>
	/* ---------- 1 photo: full width ---------- */
	.single-link {
		display: block;
		width: 100%;
	}
	.single {
		width: 100%;
		max-height: 500px;
		object-fit: cover;
		display: block;
	}

	/* ---------- shared tile mechanics ---------- */
	.grid {
		display: grid;
		gap: 2px;
	}
	.tile {
		position: relative;
		overflow: hidden;
		display: block;
	}
	.tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.more {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		font-weight: 600;
	}

	/* ---------- 2 photos: two equal columns ---------- */
	.grid.n2 {
		grid-template-columns: 1fr 1fr;
		aspect-ratio: 16 / 10;
	}

	/* ---------- 3 photos: big left (full height), 2 stacked right ---------- */
	.grid.n3 {
		grid-template-columns: 2fr 1fr;
		grid-template-rows: 1fr 1fr;
		grid-template-areas:
			'a b'
			'a c';
		aspect-ratio: 16 / 10;
	}
	.grid.n3 .tile:nth-child(1) {
		grid-area: a;
	}
	.grid.n3 .tile:nth-child(2) {
		grid-area: b;
	}
	.grid.n3 .tile:nth-child(3) {
		grid-area: c;
	}

	/* ---------- 4 photos: 2x2 ---------- */
	.grid.n4 {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		aspect-ratio: 1 / 1;
	}

	/* ---------- 5(+) photos: 2 on top, 3 on bottom ---------- */
	.grid.n5 {
		grid-template-columns: repeat(6, 1fr);
		grid-template-rows: 1fr 1fr;
		grid-template-areas:
			'a a a b b b'
			'c c d d e e';
		aspect-ratio: 16 / 11;
	}
	.grid.n5 .tile:nth-child(1) {
		grid-area: a;
	}
	.grid.n5 .tile:nth-child(2) {
		grid-area: b;
	}
	.grid.n5 .tile:nth-child(3) {
		grid-area: c;
	}
	.grid.n5 .tile:nth-child(4) {
		grid-area: d;
	}
	.grid.n5 .tile:nth-child(5) {
		grid-area: e;
	}
</style>
