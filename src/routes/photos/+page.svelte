<script lang="ts">
	import { enhance } from '$app/forms';
	import { pushState, replaceState, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import PhotoTabs from '$lib/components/PhotoTabs.svelte';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';

	let { data }: { data: PageData } = $props();

	let selecting = $state(false);
	let selectedIds = $state<string[]>([]);
	let selectionError = $state<string | undefined>();

	function toggleSelecting() {
		selecting = !selecting;
		selectedIds = [];
		selectionError = undefined;
	}

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

	{#if data.user}
		<button type="button" class="toggle-select" onclick={toggleSelecting}>
			{selecting ? 'Abbrechen' : '📁 Album erstellen'}
		</button>
	{/if}

	{#if selecting}
		<form
			method="POST"
			action="?/createAlbumFromSelection"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure') {
						selectionError = result.data?.error as string | undefined;
						return;
					}
					selectionError = undefined;
					await update();
				};
			}}
		>
			<div class="grid">
				{#each data.photos as p (p.id)}
					{#if p.albumId == null}
						<label class="tile selectable" class:checked={selectedIds.includes(p.id)}>
							<input type="checkbox" name="photoIds" value={p.id} bind:group={selectedIds} />
							<img src="/uploads/{p.filename}" alt={p.originalName ?? ''} loading="lazy" />
						</label>
					{:else}
						<div class="tile in-album">
							<img src="/uploads/{p.filename}" alt={p.originalName ?? ''} loading="lazy" />
						</div>
					{/if}
				{/each}
			</div>

			{#if selectedIds.length > 0}
				<div class="selection-bar">
					{#if selectionError}<p class="error">{selectionError}</p>{/if}
					<span class="count">{selectedIds.length} ausgewählt</span>
					<input type="text" name="albumTitle" placeholder="Album-Titel (optional)" />
					<button type="submit">Album erstellen</button>
				</div>
			{/if}
		</form>
	{:else}
		<div class="grid">
			{#each data.photos as p (p.id)}
				<a class="tile" href={hrefFor(p.id)} onclick={openPhoto(p.id)}>
					<img src="/uploads/{p.filename}" alt={p.originalName ?? ''} loading="lazy" />
				</a>
			{/each}
		</div>
	{/if}
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
	.toggle-select {
		margin-bottom: 12px;
		background: none;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		padding: 8px 14px;
		font-size: 14px;
		font-weight: 600;
		color: var(--fb-blue);
		cursor: pointer;
	}
	.toggle-select:hover {
		background: var(--fb-hover);
	}
	.tile.selectable {
		position: relative;
		cursor: pointer;
	}
	.tile.selectable input[type='checkbox'] {
		position: absolute;
		top: 6px;
		left: 6px;
		width: 20px;
		height: 20px;
		z-index: 1;
	}
	.tile.selectable img {
		outline: 3px solid transparent;
	}
	.tile.selectable.checked img {
		outline-color: var(--fb-blue);
	}
	.tile.in-album {
		opacity: 0.35;
	}
	.selection-bar {
		position: sticky;
		bottom: 0;
		margin-top: 12px;
		padding: 12px;
		background: #fff;
		border: 1px solid var(--fb-border);
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.selection-bar .count {
		font-size: 13px;
		font-weight: 600;
		color: var(--fb-gray);
	}
	.selection-bar input[type='text'] {
		flex: 1;
		min-width: 140px;
		padding: 8px 10px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 14px;
		font-family: inherit;
		color: #050505;
	}
	.selection-bar button {
		background: var(--fb-blue);
		color: #fff;
		border: none;
		border-radius: 6px;
		padding: 8px 14px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.selection-bar button:hover {
		background: #166fe0;
	}
	.selection-bar .error {
		width: 100%;
		background: #fde2e1;
		color: #b3261e;
		padding: 6px 10px;
		border-radius: 6px;
		font-size: 13px;
		margin: 0;
	}
</style>
