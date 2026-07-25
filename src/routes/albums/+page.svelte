<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import type { PageData } from './$types';
	import PhotoTabs from '$lib/components/photo/PhotoTabs.svelte';
	import JustifiedGallery from '$lib/components/photo/JustifiedGallery.svelte';
	import Pagination from '$lib/components/shared/Pagination.svelte';
	import { tick } from 'svelte';
	let { data }: { data: PageData } = $props();

	let creating = $state(false);
	let error = $state<string | undefined>();
	let fileCount = $state(0);
	let submitting = $state(false);
	let dirty = $state(false);
	let albumTitleInput: HTMLInputElement | undefined = $state();
	let createToggle: HTMLButtonElement | undefined = $state();
	let errorMessage: HTMLParagraphElement | undefined = $state();

	beforeNavigate(({ cancel, willUnload }) => {
		if (!dirty || submitting) return;
		if (willUnload) {
			cancel();
			return;
		}
		if (!confirm('Dein noch nicht erstelltes Album verwerfen?')) cancel();
	});

	async function toggleCreating() {
		if (creating && dirty && !confirm('Dein noch nicht erstelltes Album verwerfen?')) return;
		creating = !creating;
		if (!creating) {
			dirty = false;
			error = undefined;
		}
		if (creating) {
			await tick();
			albumTitleInput?.focus();
		}
	}

	function onFilesChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		fileCount = input.files?.length ?? 0;
	}
</script>

<svelte:head>
	<title>Alben · achis.blog</title>
</svelte:head>

<div class="page">
	<h1>Alben</h1>
	<PhotoTabs />

	{#if data.user}
		<button
			bind:this={createToggle}
			type="button"
			class="toggle-create"
			onclick={toggleCreating}
			aria-expanded={creating}
			aria-controls="create-album-form"
			disabled={submitting}
		>
			{creating ? 'Abbrechen' : '+ Neues Album'}
		</button>

		{#if creating}
			<form
				id="create-album-form"
				method="POST"
				action="?/createAlbum"
				enctype="multipart/form-data"
				class="card create-album-form"
				aria-busy={submitting}
				oninput={() => (dirty = true)}
				onchange={() => (dirty = true)}
				use:enhance={() => {
					submitting = true;
					return async ({ result, update, formElement }) => {
						if (result.type === 'failure') {
							error = result.data?.error as string | undefined;
						} else if (result.type === 'error') {
							error = 'Das Album konnte nicht erstellt werden. Bitte versuche es erneut.';
						} else {
							error = undefined;
							formElement.reset();
							fileCount = 0;
							dirty = false;
							creating = false;
						}
						await update();
						submitting = false;
						await tick();
						if (error) errorMessage?.focus();
						else createToggle?.focus();
					};
				}}
			>
				{#if error}
					<p bind:this={errorMessage} class="error" role="alert" tabindex="-1">{error}</p>
				{/if}

				<label>
					Album-Titel (optional)
					<input
						bind:this={albumTitleInput}
						type="text"
						name="albumTitle"
						placeholder="z. B. Urlaub 2026"
					/>
				</label>

				<label>
					Beschreibung (optional)
					<textarea name="albumDescription" rows="2" placeholder="Worum geht's in diesem Album?"
					></textarea>
				</label>

				<label>
					Fotos (mindestens 2)
					<input type="file" name="photos" accept="image/*" multiple onchange={onFilesChange} />
				</label>

				<button type="submit" disabled={fileCount < 2 || submitting}>
					{submitting ? 'Album wird erstellt…' : 'Album erstellen'}
				</button>
			</form>
		{/if}
	{/if}

	{#if data.albums.length === 0}
		<p class="empty">
			{#if data.user}
				Noch keine Alben. Erstelle oben dein erstes Album.
			{:else}
				Noch keine Alben.
			{/if}
		</p>
	{/if}

	<JustifiedGallery items={data.albums} targetRowHeight={210} gap={8}>
		{#snippet children(a)}
			<a class="card tile" href="/albums/{a.slug ?? a.id}">
				{#if a.photos[0]}
					<img
						src="/uploads/{a.photos[0].filename}"
						alt=""
						width={a.photos[0].width ?? undefined}
						height={a.photos[0].height ?? undefined}
						loading={a === data.albums[0] ? 'eager' : 'lazy'}
						fetchpriority={a === data.albums[0] ? 'high' : undefined}
						decoding="async"
					/>
				{:else}
					<div class="placeholder">📁</div>
				{/if}
				<div class="tile-title">{a.title}</div>
			</a>
		{/snippet}
	</JustifiedGallery>

	<Pagination pagination={data.pagination} />
</div>

<style>
	h1 {
		font-size: 20px;
		margin: 0 0 16px 0;
	}
	.empty {
		color: var(--fb-gray);
	}
	.toggle-create {
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
	.toggle-create:hover {
		background: var(--fb-hover);
	}
	.create-album-form {
		padding: 20px;
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.create-album-form label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.create-album-form input[type='text'],
	.create-album-form textarea {
		padding: 10px 12px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 15px;
		font-family: inherit;
		color: #050505;
	}
	.create-album-form input[type='file'] {
		font-size: 14px;
	}
	.create-album-form button[type='submit'] {
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
	.create-album-form button[type='submit']:hover {
		background: #166fe0;
	}
	.create-album-form button[type='submit']:disabled {
		background: var(--fb-border);
		cursor: not-allowed;
	}
	.create-album-form .error {
		background: #fde2e1;
		color: #b3261e;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		margin: 0;
	}
	.tile {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.tile img,
	.placeholder {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		background: var(--fb-hover);
	}
	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
	}
	.tile-title {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 24px 10px 9px;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
		color: #fff;
		font-size: 14px;
		font-weight: 600;
	}
</style>
