<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';

	let fileCount = $state(0);
	let error = $state<string | undefined>();

	function todayLocalDate() {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	}

	let dateValue = $state(todayLocalDate());

	function onFilesChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		fileCount = input.files?.length ?? 0;
	}
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
				fileCount = 0;
				// formElement.reset() clears the date input's DOM value directly without Svelte
				// noticing, so re-assigning dateValue right away can lose to that reset in the
				// same tick — wait a tick first so our value wins.
				await tick();
				dateValue = todayLocalDate();
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

	<label>
		Datum
		<input type="date" name="date" bind:value={dateValue} />
	</label>
	<p class="hint">Für ältere Fotos anpassbar — wirkt sich auf Feed-Reihenfolge, Album und Foto-Stream aus.</p>

	<label>
		Text
		<textarea name="text" rows="3" placeholder="Was möchtest du teilen?"></textarea>
	</label>

	<label>
		Fotos (optional, mehrere möglich)
		<input type="file" name="photos" accept="image/*" multiple onchange={onFilesChange} />
	</label>

	{#if fileCount >= 2}
		<label class="checkbox-row">
			<input type="checkbox" name="saveAsAlbum" />
			Diese {fileCount} Fotos zusätzlich als Album speichern
		</label>

		<label>
			Album-Titel (optional)
			<input type="text" name="albumTitle" placeholder="z. B. Urlaub 2026" />
		</label>
	{:else if fileCount === 1}
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
	input[type='text'],
	textarea {
		padding: 10px 12px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 15px;
		font-family: inherit;
		color: #050505;
	}
	input[type='file'] {
		font-size: 14px;
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
