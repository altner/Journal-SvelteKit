<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import ActivityFeedCard from '$lib/components/ActivityFeedCard.svelte';
	import TagInput from '$lib/components/TagInput.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data }: { data: PageData } = $props();

	let creating = $state(false);
	let error = $state<string | undefined>();
	let hasFile = $state(false);
	let editingId = $state<string | null>(null);

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		hasFile = (input.files?.length ?? 0) > 0;
	}
</script>

<svelte:head>
	<title>Aktivitäten · achis.blog</title>
</svelte:head>

<div class="page">
	<h1>Aktivitäten</h1>

	{#if data.user}
		<button type="button" class="toggle-create" onclick={() => (creating = !creating)}>
			{creating ? 'Abbrechen' : '+ Neue Aktivität'}
		</button>

		{#if creating}
			<form
				method="POST"
				action="?/upload"
				enctype="multipart/form-data"
				class="card upload-form"
				use:enhance={() => {
					return async ({ result, update, formElement }) => {
						if (result.type === 'failure') {
							error = result.data?.error as string | undefined;
						} else {
							error = undefined;
							formElement.reset();
							hasFile = false;
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
					GPX-Datei
					<input type="file" name="trackFile" accept=".gpx" onchange={onFileChange} />
				</label>

				<label>
					Fotos (optional)
					<input type="file" name="photos" accept="image/*" multiple />
				</label>

				<label>
					Titel (optional)
					<input type="text" name="title" placeholder="z. B. Morgenlauf" />
				</label>

				<label>
					Sportart
					<select name="sport">
						<option value="">automatisch erkennen</option>
						<option value="running">Laufen</option>
						<option value="cycling">Radfahren</option>
						<option value="hiking">Wandern</option>
						<option value="walking">Spazieren</option>
						<option value="other">Sonstiges</option>
					</select>
				</label>

				<label>
					Tags
					<TagInput name="tags" />
				</label>

				<button type="submit" disabled={!hasFile}>Aktivität hochladen</button>
			</form>
		{/if}
	{/if}

	{#if data.activities.length === 0}
		<p class="empty">Noch keine Aktivitäten.</p>
	{/if}

	<div class="list">
		{#each data.activities as a (a.id)}
			<ActivityFeedCard
				activity={a}
				user={data.user}
				editing={editingId === a.id}
				onEdit={() => (editingId = a.id)}
				onEditDone={() => (editingId = null)}
			/>
		{/each}
	</div>

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
		padding: 8px 14px;
		font-size: 14px;
		font-weight: 600;
		color: var(--fb-blue);
		cursor: pointer;
	}
	.toggle-create:hover {
		background: var(--fb-hover);
	}
	.upload-form {
		padding: 20px;
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.upload-form label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.upload-form input[type='text'],
	.upload-form select {
		padding: 10px 12px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 15px;
		font-family: inherit;
		color: #050505;
	}
	.upload-form input[type='file'] {
		font-size: 14px;
	}
	.upload-form button[type='submit'] {
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
	.upload-form button[type='submit']:hover {
		background: #166fe0;
	}
	.upload-form button[type='submit']:disabled {
		background: var(--fb-border);
		cursor: not-allowed;
	}
	.upload-form .error {
		background: #fde2e1;
		color: #b3261e;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		margin: 0;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
</style>
