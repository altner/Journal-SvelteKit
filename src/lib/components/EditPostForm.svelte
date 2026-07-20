<script lang="ts">
	import { enhance } from '$app/forms';
	import TagInput from './TagInput.svelte';
	import LocationPicker from './LocationPicker.svelte';
	import BlockEditor from './BlockEditor.svelte';

	let {
		postId,
		title,
		blocks,
		tags = [],
		location = null,
		onSaved,
		onCancel
	}: {
		postId: string;
		title: string | null;
		blocks: (
			| { id: string; type: 'text'; text: string }
			| {
					id: string;
					type: 'photos';
					photos: { id: string; filename: string }[];
					excludeFromStream: boolean;
			  }
		)[];
		tags?: string[];
		location?: {
			latitude: number;
			longitude: number;
			locationPlace: string | null;
			locationCountry: string | null;
			locationName: string | null;
		} | null;
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	let error = $state<string | undefined>();
</script>

<form
	method="POST"
	action="/posts/{postId}?/edit"
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
		Titel (optional)
		<input type="text" name="title" value={title ?? ''} placeholder="Worum geht's?" />
	</label>

	<BlockEditor initialBlocks={blocks} />

	<label>
		Tags
		<TagInput name="tags" initialTags={tags} />
	</label>

	<LocationPicker initialLocation={location} />

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
	input[type='text'] {
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
