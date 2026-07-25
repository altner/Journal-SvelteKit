<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import TagInput from '../shared/TagInput.svelte';
	import { onMount, tick } from 'svelte';

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
	let submitting = $state(false);
	let dirty = $state(false);
	let titleInput: HTMLInputElement | undefined = $state();
	let errorMessage: HTMLParagraphElement | undefined = $state();

	onMount(() => titleInput?.focus());

	beforeNavigate(({ cancel, willUnload }) => {
		if (!dirty || submitting) return;
		if (willUnload) {
			cancel();
			return;
		}
		if (!confirm('Ungespeicherte Änderungen verwerfen?')) cancel();
	});

	function cancelEditing() {
		if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
		dirty = false;
		onCancel?.();
	}
</script>

<form
	method="POST"
	action="/activities/{activitySlug}?/edit"
	enctype="multipart/form-data"
	class="edit-form"
	aria-busy={submitting}
	oninput={() => (dirty = true)}
	onchange={() => (dirty = true)}
	use:enhance={() => {
		submitting = true;
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				error = result.data?.error as string | undefined;
				submitting = false;
				await tick();
				errorMessage?.focus();
				return;
			}
			if (result.type === 'error') {
				error = 'Die Aktivität konnte nicht gespeichert werden. Bitte versuche es erneut.';
				submitting = false;
				await tick();
				errorMessage?.focus();
				return;
			}
			error = undefined;
			dirty = false;
			await update();
			submitting = false;
			onSaved?.();
		};
	}}
>
	{#if error}<p bind:this={errorMessage} class="error" role="alert" tabindex="-1">{error}</p>{/if}

	<label>
		Titel
		<input bind:this={titleInput} type="text" name="title" value={title} />
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

	<TagInput name="tags" initialTags={tags} />

	<label>
		Weitere Fotos (optional)
		<input type="file" name="photos" accept="image/*" multiple />
	</label>

	<div class="actions">
		<button type="submit" disabled={submitting}>{submitting ? 'Wird gespeichert…' : 'Speichern'}</button>
		<button type="button" class="cancel" disabled={submitting} onclick={cancelEditing}>Abbrechen</button>
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
		min-height: 44px;
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	button:disabled {
		cursor: wait;
		opacity: 0.65;
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
