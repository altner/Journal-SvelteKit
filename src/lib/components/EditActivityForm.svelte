<script lang="ts">
	import { enhance } from '$app/forms';
	import TagInput from './TagInput.svelte';

	let {
		activitySlug,
		title,
		sport,
		tags = [],
		onSaved,
		onCancel
	}: {
		activitySlug: string;
		title: string;
		sport: string;
		tags?: string[];
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	let error = $state<string | undefined>();
</script>

<form
	method="POST"
	action="/activities/{activitySlug}?/edit"
	enctype="multipart/form-data"
	class="edit-form"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				error = result.data?.error as string | undefined;
				return;
			}
			error = undefined;
			await update();
			onSaved?.();
		};
	}}
>
	{#if error}<p class="error">{error}</p>{/if}

	<label>
		Titel
		<input type="text" name="title" value={title} />
	</label>

	<label>
		Sportart
		<select name="sport" value={sport}>
			<option value="running">Laufen</option>
			<option value="cycling">Radfahren</option>
			<option value="hiking">Wandern</option>
			<option value="walking">Spazieren</option>
			<option value="other">Sonstiges</option>
		</select>
	</label>

	<label>
		Tags
		<TagInput name="tags" initialTags={tags} />
	</label>

	<label>
		Weitere Fotos (optional)
		<input type="file" name="photos" accept="image/*" multiple />
	</label>

	<div class="actions">
		<button type="submit">Speichern</button>
		<button type="button" class="cancel" onclick={() => onCancel?.()}>Abbrechen</button>
	</div>
</form>

<style>
	.edit-form {
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	input[type='text'],
	select {
		padding: 8px 10px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 15px;
		font-family: inherit;
		color: #050505;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
	button {
		border: none;
		border-radius: 6px;
		padding: 6px 14px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	button[type='submit'] {
		background: var(--fb-blue);
		color: #fff;
	}
	button[type='submit']:hover {
		background: #166fe0;
	}
	.cancel {
		background: var(--fb-hover);
		color: var(--fb-gray);
	}
	.error {
		background: #fde2e1;
		color: #b3261e;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		margin: 0;
	}
</style>
