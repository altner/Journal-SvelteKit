<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import PhotoTabs from '$lib/components/PhotoTabs.svelte';
	let { data }: { data: PageData } = $props();

	let creating = $state(false);
	let error = $state<string | undefined>();
	let fileCount = $state(0);

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
		<button type="button" class="toggle-create" onclick={() => (creating = !creating)}>
			{creating ? 'Abbrechen' : '+ Neues Album'}
		</button>

		{#if creating}
			<form
				method="POST"
				action="?/createAlbum"
				enctype="multipart/form-data"
				class="card create-album-form"
				use:enhance={() => {
					return async ({ result, update, formElement }) => {
						if (result.type === 'failure') {
							error = result.data?.error as string | undefined;
						} else {
							error = undefined;
							formElement.reset();
							fileCount = 0;
							creating = false;
						}
						await update();
					};
				}}
			>
				{#if error}
					<p class="error">{error}</p>
				{/if}

				<label>
					Album-Titel (optional)
					<input type="text" name="albumTitle" placeholder="z. B. Urlaub 2026" />
				</label>

				<label>
					Fotos (mindestens 2)
					<input type="file" name="photos" accept="image/*" multiple onchange={onFilesChange} />
				</label>

				<button type="submit" disabled={fileCount < 2}>Album erstellen</button>
			</form>
		{/if}
	{/if}

	{#if data.albums.length === 0}
		<p class="empty">Noch keine Alben. Lade mehrere Fotos in einem Post hoch und aktiviere "als Album speichern".</p>
	{/if}

	<div class="grid">
		{#each data.albums as a (a.id)}
			<a class="card tile" href="/albums/{a.id}">
				{#if a.photos[0]}
					<img src="/uploads/{a.photos[0].filename}" alt="" />
				{:else}
					<div class="placeholder">📁</div>
				{/if}
				<div class="tile-title">{a.title}</div>
			</a>
		{/each}
	</div>
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
	.create-album-form input[type='text'] {
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
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}
	@media (min-width: 768px) {
		.grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.tile {
		overflow: hidden;
	}
	.tile img,
	.placeholder {
		width: 100%;
		aspect-ratio: 4 / 3;
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
		padding: 8px 10px;
		font-size: 14px;
		font-weight: 600;
	}
</style>
