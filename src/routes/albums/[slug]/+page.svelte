<script lang="ts">
	import { pushState, replaceState, invalidateAll, goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import DeleteAlbumButton from '$lib/components/DeleteAlbumButton.svelte';

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

	function onKeydown(e: KeyboardEvent) {
		if (!activePhoto) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight' && photos.length > 1) goToIndex(activeIndex + 1);
		else if (e.key === 'ArrowLeft' && photos.length > 1) goToIndex(activeIndex - 1);
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

	function onFilesChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		fileCount = input.files?.length ?? 0;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>{headTitle}</title>
	<link rel="canonical" href={data.canonicalUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={headTitle} />
	<meta property="og:url" content={data.canonicalUrl} />
	{#if data.ogImage}<meta property="og:image" content={data.ogImage} />{/if}
	<meta name="twitter:card" content={data.ogImage ? 'summary_large_image' : 'summary'} />
</svelte:head>

<div class="page">
	<a class="back" href="/albums">← Alle Alben</a>
	<div class="album-header">
		<h1>{data.album.title}</h1>
		{#if data.user}
			<DeleteAlbumButton albumSlug={data.album.slug ?? data.album.id} afterDelete={() => goto('/albums')} />
		{/if}
	</div>

	{#if data.album.originPostId}
		<a class="origin" href="/posts/{data.originPostSlug}">Zum Ursprungs-Post</a>
	{/if}

	{#if data.user}
		<form
			method="POST"
			action="?/addPhotos"
			enctype="multipart/form-data"
			class="card add-photos-form"
			use:enhance={() => {
				return async ({ result, update, formElement }) => {
					if (result.type === 'failure') {
						addError = result.data?.error as string | undefined;
					} else {
						addError = undefined;
						formElement.reset();
						fileCount = 0;
					}
					await update();
				};
			}}
		>
			{#if addError}
				<p class="error">{addError}</p>
			{/if}

			<label>
				Text (optional)
				<textarea name="text" rows="2" placeholder="Was möchtest du dazu sagen?"></textarea>
			</label>

			<label>
				Fotos
				<input type="file" name="photos" accept="image/*" multiple onchange={onFilesChange} />
			</label>

			<button type="submit" disabled={fileCount === 0}>Fotos hinzufügen</button>
		</form>
	{/if}

	<div class="grid">
		{#each photos as p (p.id)}
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
		font-size: 13px;
		color: var(--fb-gray);
		display: inline-block;
		margin-bottom: 8px;
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
	.origin {
		display: inline-block;
		font-size: 13px;
		color: var(--fb-blue);
		margin-bottom: 16px;
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
