<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import TagInput from './TagInput.svelte';
	import LocationPicker from './LocationPicker.svelte';
	import BlockEditor from './BlockEditor.svelte';

	let photoCount = $state(0);
	let error = $state<string | undefined>();
	let tagInputRef: ReturnType<typeof TagInput> | undefined = $state();
	let locationPickerRef: ReturnType<typeof LocationPicker> | undefined = $state();
	let blockEditorRef: ReturnType<typeof BlockEditor> | undefined = $state();

	function todayLocalDate() {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	}

	function nowLocalTime() {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	let dateValue = $state(todayLocalDate());
	let timeValue = $state(nowLocalTime());
</script>

<form
	method="POST"
	action="/posts/new"
	enctype="multipart/form-data"
	class="card post-form"
	use:enhance={() => {
		return async ({ result, update, formElement }) => {
			if (result.type === 'failure') {
				error = result.data?.error as string | undefined;
			} else {
				error = undefined;
				formElement.reset();
				photoCount = 0;
				tagInputRef?.reset();
				locationPickerRef?.reset();
				blockEditorRef?.reset();
				// formElement.reset() clears the date/time inputs' DOM values directly without
				// Svelte noticing, so re-assigning right away can lose to that reset in the same
				// tick — wait a tick first so our values win.
				await tick();
				dateValue = todayLocalDate();
				timeValue = nowLocalTime();
			}
			await update();
		};
	}}
>
	{#if error}
		<p class="error">{error}</p>
	{/if}

	<label>
		Titel (optional)
		<input type="text" name="title" placeholder="Worum geht's?" />
	</label>

	<div class="date-time-row">
		<label>
			Datum
			<input type="date" name="date" bind:value={dateValue} />
		</label>
		<label>
			Uhrzeit
			<input type="time" name="time" bind:value={timeValue} />
		</label>
	</div>
	<p class="hint">Für ältere Fotos anpassbar — wirkt sich auf Feed-Reihenfolge, Album und Foto-Stream aus.</p>

	<BlockEditor bind:this={blockEditorRef} onPhotoCountChange={(n) => (photoCount = n)} />

	<label>
		Tags
		<TagInput name="tags" bind:this={tagInputRef} />
	</label>

	<LocationPicker bind:this={locationPickerRef} />

	{#if photoCount >= 2}
		<label class="checkbox-row">
			<input type="checkbox" name="saveAsAlbum" />
			Diese {photoCount} Fotos zusätzlich als Album speichern
		</label>

		<label>
			Album-Titel (optional)
			<input type="text" name="albumTitle" placeholder="z. B. Urlaub 2026" />
		</label>
	{:else if photoCount === 1}
		<p class="hint">Einzelnes Foto — landet im Foto-Stream.</p>
	{/if}

	<button type="submit">Veröffentlichen</button>
</form>

<style>
	.post-form {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.date-time-row {
		display: flex;
		gap: 14px;
	}
	.date-time-row label {
		flex: 1;
	}
	input[type='text'] {
		padding: 10px 12px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 15px;
		font-family: inherit;
		color: #050505;
	}
	.checkbox-row {
		flex-direction: row;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #050505;
	}
	.hint {
		font-size: 13px;
		color: var(--fb-gray);
		margin: 0;
	}
	button {
		margin-top: 8px;
		background: var(--fb-blue);
		color: #fff;
		border: none;
		border-radius: 6px;
		padding: 10px 0;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
	}
	button:hover {
		background: #166fe0;
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
