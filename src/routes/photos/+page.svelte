<script lang="ts">
	import { enhance } from '$app/forms';
	import { pushState, replaceState, invalidateAll, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import PhotoTabs from '$lib/components/PhotoTabs.svelte';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import JustifiedGallery from '$lib/components/JustifiedGallery.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { tick } from 'svelte';

	let { data }: { data: PageData } = $props();

	let selecting = $state(false);
	let selectedIds = $state<string[]>([]);
	let selectionError = $state<string | undefined>();
	let submittingSelection = $state(false);
	let selectionDirty = $state(false);
	let selectionToggle: HTMLButtonElement | undefined = $state();
	let selectionErrorMessage: HTMLParagraphElement | undefined = $state();
	let pageHeading: HTMLHeadingElement | undefined = $state();
	const selectablePhotos = $derived(
		data.photos.filter((photo) => photo.kind === 'post' && photo.albumId == null)
	);

	beforeNavigate(({ cancel, willUnload }) => {
		if (!selectionDirty || submittingSelection) return;
		if (willUnload) {
			cancel();
			return;
		}
		if (!confirm('Deine Auswahl für das neue Album verwerfen?')) cancel();
	});

	function toggleSelecting() {
		if (selecting && selectionDirty && !confirm('Deine Auswahl für das neue Album verwerfen?')) return;
		selecting = !selecting;
		selectedIds = [];
		selectionDirty = false;
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
	<h1 bind:this={pageHeading} tabindex="-1">Fotos</h1>
	<PhotoTabs />

	{#if data.photos.length === 0}
		<p class="empty">Noch keine Fotos.</p>
	{/if}

	{#if data.user && selectablePhotos.length >= 2}
		<button
			bind:this={selectionToggle}
			type="button"
			class="toggle-select"
			onclick={toggleSelecting}
			aria-expanded={selecting}
			aria-controls="album-selection-form"
			disabled={submittingSelection}
		>
			{selecting ? 'Abbrechen' : '📁 Lose Fotos als Album'}
		</button>
	{/if}

	{#if selecting}
		<p class="selection-hint">Wähle mindestens zwei Fotos für das neue Album aus.</p>
		<form
			id="album-selection-form"
			method="POST"
			action="?/createAlbumFromSelection"
			aria-busy={submittingSelection}
			oninput={() => (selectionDirty = true)}
			onchange={() => (selectionDirty = true)}
			use:enhance={() => {
				submittingSelection = true;
				return async ({ result, update }) => {
					if (result.type === 'failure') {
						selectionError = result.data?.error as string | undefined;
						submittingSelection = false;
						await tick();
						selectionErrorMessage?.focus();
						return;
					}
					if (result.type === 'error') {
						selectionError = 'Das Album konnte nicht erstellt werden. Bitte versuche es erneut.';
						submittingSelection = false;
						await tick();
						selectionErrorMessage?.focus();
						return;
					}
					selectionError = undefined;
					await update();
					selectedIds = [];
					selectionDirty = false;
					selecting = false;
					submittingSelection = false;
					await tick();
					(selectionToggle ?? pageHeading)?.focus();
				};
			}}
		>
			<JustifiedGallery items={selectablePhotos}>
				{#snippet children(p)}
					<label class="tile selectable" class:checked={selectedIds.includes(p.id)}>
						<input
							type="checkbox"
							name="photoIds"
							value={p.id}
							bind:group={selectedIds}
							aria-label={p.originalName ? `Foto ${p.originalName} auswählen` : 'Foto auswählen'}
						/>
						<img src="/uploads/{p.filename}" alt={p.originalName ?? ''} width={p.width ?? undefined} height={p.height ?? undefined} loading="lazy" decoding="async" />
					</label>
				{/snippet}
			</JustifiedGallery>

			{#if selectedIds.length > 0}
				<div class="selection-bar">
					{#if selectionError}<p bind:this={selectionErrorMessage} class="error" role="alert" tabindex="-1">{selectionError}</p>{/if}
					<span class="count" aria-live="polite">{selectedIds.length} ausgewählt</span>
					<input type="text" name="albumTitle" placeholder="Album-Titel (optional)" />
					<button type="submit" disabled={selectedIds.length < 2 || submittingSelection}>
						{submittingSelection ? 'Album wird erstellt…' : 'Album erstellen'}
					</button>
				</div>
			{/if}
		</form>
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
	.toggle-select {
		margin-bottom: 12px;
		background: none;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		min-height: 44px;
		padding: 8px 14px;
		font-size: 14px;
		font-weight: 600;
		color: var(--fb-blue);
		cursor: pointer;
	}
	.toggle-select:hover {
		background: var(--fb-hover);
	}
	.selection-hint {
		margin: 0 0 12px;
		color: var(--fb-gray);
		font-size: 13px;
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
		min-height: 44px;
		font-size: 14px;
		font-family: inherit;
		color: #050505;
	}
	.selection-bar button {
		background: var(--fb-blue);
		color: #fff;
		border: none;
		border-radius: 6px;
		min-height: 44px;
		padding: 8px 14px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.selection-bar button:hover {
		background: #166fe0;
	}
	.selection-bar button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
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
