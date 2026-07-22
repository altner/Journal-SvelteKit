<script lang="ts">
	import { pushState, replaceState, invalidateAll, goto, beforeNavigate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import DeleteAlbumButton from '$lib/components/DeleteAlbumButton.svelte';
	import JustifiedGallery from '$lib/components/JustifiedGallery.svelte';
	import OwnerActions from '$lib/components/OwnerActions.svelte';
	import { tick } from 'svelte';

	let { data }: { data: PageData } = $props();

	const headTitle = $derived(`${data.album.title} · achis.blog`);

	function hrefFor(photoId: string) {
		return `/albums/${data.album.slug}/photo/${photoId}`;
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

	const photos = $derived(data.album.photos);
	const activePhoto = $derived(photos.find((p) => p.id === page.state.lightboxPhotoId));
	const activeIndex = $derived(activePhoto ? photos.indexOf(activePhoto) : -1);

	function goToIndex(i: number) {
		const target = photos[(i + photos.length) % photos.length];
		replaceState(hrefFor(target.id), { lightboxPhotoId: target.id });
	}

	function close() {
		history.back();
	}

	async function handlePhotoDeleted() {
		const deletedIndex = activeIndex;
		await invalidateAll();
		if (photos.length === 0) {
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

	let fileCount = $state(0);
	let addError = $state<string | undefined>();
	let addingPhotos = $state(false);
	let submittingPhotos = $state(false);
	let addPhotosDirty = $state(false);
	let addPhotosToggle: HTMLButtonElement | undefined = $state();
	let addPhotosText: HTMLTextAreaElement | undefined = $state();
	let addPhotosErrorMessage: HTMLParagraphElement | undefined = $state();

	function onFilesChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		fileCount = input.files?.length ?? 0;
	}

	beforeNavigate(({ cancel, willUnload }) => {
		if (!addPhotosDirty || submittingPhotos) return;
		if (willUnload) {
			cancel();
			return;
		}
		if (!confirm('Deine noch nicht hinzugefügten Fotos verwerfen?')) cancel();
	});

	async function toggleAddingPhotos() {
		if (addingPhotos && addPhotosDirty && !confirm('Deine noch nicht hinzugefügten Fotos verwerfen?')) return;
		addingPhotos = !addingPhotos;
		addError = undefined;
		if (!addingPhotos) addPhotosDirty = false;
		if (addingPhotos) {
			await tick();
			addPhotosText?.focus();
		}
	}
</script>

<svelte:head>
	<title>{headTitle}</title>
	{#if data.album.description}<meta name="description" content={data.album.description} />{/if}
	<link rel="canonical" href={data.canonicalUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={headTitle} />
	{#if data.album.description}<meta property="og:description" content={data.album.description} />{/if}
	<meta property="og:url" content={data.canonicalUrl} />
	{#if data.ogImage}<meta property="og:image" content={data.ogImage} />{/if}
	<meta name="twitter:card" content={data.ogImage ? 'summary_large_image' : 'summary'} />
</svelte:head>

<div class="page">
	<a class="back" href="/albums">← Alle Alben</a>
	<div class="album-header">
		<h1>{data.album.title}</h1>
		{#if data.user}
			<OwnerActions label="Albumaktionen">
				<DeleteAlbumButton albumSlug={data.album.slug ?? data.album.id} afterDelete={() => goto('/albums')} />
			</OwnerActions>
		{/if}
	</div>

	{#if data.album.description}
		<p class="description">{data.album.description}</p>
	{/if}

	{#if data.album.originPostId}
		<a class="origin" href="/posts/{data.originPostSlug}">Zum ursprünglichen Beitrag</a>
	{/if}

	{#if data.user}
		<button
			bind:this={addPhotosToggle}
			type="button"
			class="toggle-add"
			onclick={toggleAddingPhotos}
			aria-expanded={addingPhotos}
			aria-controls="add-album-photos-form"
			disabled={submittingPhotos}
		>
			{addingPhotos ? 'Abbrechen' : '+ Fotos hinzufügen'}
		</button>
	{/if}

	{#if data.user && addingPhotos}
		<form
			id="add-album-photos-form"
			method="POST"
			action="?/addPhotos"
			enctype="multipart/form-data"
			class="card add-photos-form"
			aria-busy={submittingPhotos}
			oninput={() => (addPhotosDirty = true)}
			onchange={() => (addPhotosDirty = true)}
			use:enhance={() => {
				submittingPhotos = true;
				return async ({ result, update, formElement }) => {
					const succeeded = result.type !== 'failure' && result.type !== 'error';
					if (result.type === 'failure') {
						addError = result.data?.error as string | undefined;
					} else if (result.type === 'error') {
						addError = 'Die Fotos konnten nicht hinzugefügt werden. Bitte versuche es erneut.';
					} else {
						addError = undefined;
						formElement.reset();
						fileCount = 0;
						addPhotosDirty = false;
						addingPhotos = false;
					}
					await update();
					submittingPhotos = false;
					if (succeeded) {
						await tick();
						addPhotosToggle?.focus();
					} else {
						await tick();
						addPhotosErrorMessage?.focus();
					}
				};
			}}
		>
			{#if addError}
				<p bind:this={addPhotosErrorMessage} class="error" role="alert" tabindex="-1">{addError}</p>
			{/if}

			<label>
				Text (optional)
				<textarea
					bind:this={addPhotosText}
					name="text"
					rows="2"
					placeholder="Was möchtest du dazu sagen?"
				></textarea>
			</label>

			<label>
				Fotos
				<input type="file" name="photos" accept="image/*" multiple onchange={onFilesChange} />
			</label>
			{#if fileCount > 0}
				<p class="file-summary" aria-live="polite">
					{fileCount} {fileCount === 1 ? 'Foto ausgewählt' : 'Fotos ausgewählt'}
				</p>
			{/if}

			<button type="submit" disabled={fileCount === 0 || submittingPhotos}>
				{submittingPhotos ? 'Fotos werden hinzugefügt…' : 'Fotos hinzufügen'}
			</button>
		</form>
	{/if}

	{#if photos.length === 0}
		<p class="empty">Noch keine Fotos in diesem Album.</p>
	{:else}
		<JustifiedGallery items={photos} targetRowHeight={210} gap={4}>
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
					loading={p === photos[0] ? 'eager' : 'lazy'}
					fetchpriority={p === photos[0] ? 'high' : undefined}
					decoding="async"
				/>
			</a>
			{/snippet}
		</JustifiedGallery>
	{/if}
</div>

{#if activePhoto}
	<PhotoLightbox
		photo={activePhoto}
		closeHref={page.url.pathname}
		prevHref={photos.length > 1
			? hrefFor(photos[(activeIndex - 1 + photos.length) % photos.length].id)
			: undefined}
		nextHref={photos.length > 1
			? hrefFor(photos[(activeIndex + 1) % photos.length].id)
			: undefined}
		onClose={close}
		onPrev={photos.length > 1 ? () => goToIndex(activeIndex - 1) : undefined}
		onNext={photos.length > 1 ? () => goToIndex(activeIndex + 1) : undefined}
		deleteAction={data.user ? `/albums/${data.album.slug}?/deletePhoto` : undefined}
		onDeleted={handlePhotoDeleted}
	/>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.album-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	h1 {
		font-size: 20px;
		margin: 0 0 6px 0;
	}
	.description {
		font-size: 15px;
		color: #050505;
		white-space: pre-wrap;
		margin: 0 0 16px 0;
	}
	.origin {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-size: 13px;
		color: var(--fb-blue);
		margin-bottom: 16px;
	}
	.toggle-add {
		margin-bottom: 16px;
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
	.toggle-add:hover {
		background: var(--fb-hover);
	}
	.toggle-add:disabled {
		opacity: 0.65;
		cursor: wait;
	}
	.add-photos-form {
		padding: 20px;
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.add-photos-form label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.add-photos-form textarea {
		padding: 10px 12px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 15px;
		font-family: inherit;
		color: #050505;
	}
	.add-photos-form input[type='file'] {
		font-size: 14px;
	}
	.add-photos-form button {
		margin-top: 4px;
		background: var(--fb-blue);
		color: #fff;
		border: none;
		border-radius: 6px;
		min-height: 44px;
		padding: 10px 0;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
	}
	.add-photos-form button:hover {
		background: #166fe0;
	}
	.add-photos-form button:disabled {
		background: var(--fb-border);
		cursor: not-allowed;
	}
	.add-photos-form .error {
		background: #fde2e1;
		color: #b3261e;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		margin: 0;
	}
	.file-summary {
		margin: -4px 0 0;
		font-size: 13px;
		color: var(--fb-gray);
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
