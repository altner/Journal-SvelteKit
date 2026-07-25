<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import { onMount, tick, untrack } from 'svelte';
	import TagInput from '../shared/TagInput.svelte';
	import LocationPicker from '../shared/LocationPicker.svelte';
	import BlockEditor from '../shared/BlockEditor.svelte';

	let { collapsible = false }: { collapsible?: boolean } = $props();

	let photoCount = $state(0);
	let error = $state<string | undefined>();
	let open = $state(untrack(() => !collapsible));
	let submitting = $state(false);
	let dirty = $state(false);
	let launchButton: HTMLButtonElement | undefined = $state();
	let errorMessage: HTMLParagraphElement | undefined = $state();
	let titleInput: HTMLInputElement;
	let tagInputRef: ReturnType<typeof TagInput> | undefined = $state();
	let locationPickerRef: ReturnType<typeof LocationPicker> | undefined = $state();
	let blockEditorRef: ReturnType<typeof BlockEditor> | undefined = $state();

	onMount(() => {
		if (!collapsible) titleInput?.focus();
	});

	beforeNavigate(({ cancel, willUnload }) => {
		if (!dirty || submitting) return;
		if (willUnload) {
			cancel();
			return;
		}
		if (!confirm('Deinen noch nicht veröffentlichten Beitrag verwerfen?')) cancel();
	});

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

	async function openComposer() {
		open = true;
		await tick();
		titleInput?.focus();
	}

	async function closeComposer() {
		open = false;
		await tick();
		launchButton?.focus();
	}
</script>

{#if collapsible && !open}
	<button
		type="button"
		class="card composer-launch"
		bind:this={launchButton}
		onclick={openComposer}
		aria-expanded="false"
		aria-controls="feed-post-composer"
	>
		<span aria-hidden="true">＋</span>
		<span>Was möchtest du festhalten?</span>
	</button>
{/if}

<form
	id={collapsible ? 'feed-post-composer' : undefined}
	method="POST"
	action="/posts/new"
	enctype="multipart/form-data"
	class="card post-form"
	hidden={collapsible && !open}
	aria-busy={submitting}
	oninput={() => (dirty = true)}
	onchange={() => (dirty = true)}
	use:enhance={() => {
		submitting = true;
		return async ({ result, update, formElement }) => {
			if (result.type === 'failure') {
				error = result.data?.error as string | undefined;
			} else if (result.type === 'error') {
				error = 'Der Beitrag konnte nicht veröffentlicht werden. Bitte versuche es erneut.';
			} else {
				error = undefined;
				formElement.reset();
				photoCount = 0;
				tagInputRef?.reset();
				locationPickerRef?.reset();
				blockEditorRef?.reset();
				dirty = false;
				// formElement.reset() clears the date/time inputs' DOM values directly without
				// Svelte noticing, so re-assigning right away can lose to that reset in the same
				// tick — wait a tick first so our values win.
				await tick();
				dateValue = todayLocalDate();
				timeValue = nowLocalTime();
				if (collapsible) open = false;
			}
			submitting = false;
			await update();
			if (error) {
				await tick();
				errorMessage?.focus();
			}
		};
	}}
>
	{#if collapsible}
		<div class="composer-header">
			<strong>Neuer Beitrag</strong>
			<button type="button" class="minimize" disabled={submitting} onclick={closeComposer}>Minimieren</button>
		</div>
	{/if}

	{#if error}
		<p bind:this={errorMessage} class="error" role="alert" tabindex="-1">{error}</p>
	{/if}

	<label>
		Titel (optional)
		<input bind:this={titleInput} type="text" name="title" placeholder="Worum geht's?" />
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

	<TagInput name="tags" bind:this={tagInputRef} />

	<LocationPicker bind:this={locationPickerRef} onChange={() => (dirty = true)} />

	{#if photoCount >= 2}
		<label class="checkbox-row">
			<input type="checkbox" name="saveAsAlbum" />
			Diese {photoCount} Fotos zusätzlich als Album speichern
		</label>

		<label>
			Album-Titel (optional)
			<input type="text" name="albumTitle" placeholder="z. B. Urlaub 2026" />
		</label>

		<label>
			Album-Beschreibung (optional)
			<textarea name="albumDescription" rows="2" placeholder="Worum geht's in diesem Album?"
			></textarea>
		</label>
	{:else if photoCount === 1}
		<p class="hint">Einzelnes Foto — landet im Foto-Stream.</p>
	{/if}

	<button type="submit" class="publish" disabled={submitting}>
		{submitting ? 'Wird veröffentlicht…' : 'Veröffentlichen'}
	</button>
</form>

<style>
	.composer-launch {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 14px 18px;
		border: none;
		color: var(--fb-gray);
		font: inherit;
		font-size: 15px;
		text-align: left;
		cursor: pointer;
	}
	.composer-launch:hover {
		background: var(--fb-hover);
	}
	.composer-launch span:first-child {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--fb-blue) 12%, white);
		color: var(--fb-blue);
		font-size: 20px;
	}
	.post-form {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.post-form[hidden] {
		display: none;
	}
	.composer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.minimize {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 4px;
		border: none;
		background: none;
		color: var(--fb-gray);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}
	.minimize:hover {
		color: var(--fb-blue);
		text-decoration: underline;
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
	input[type='text'],
	textarea {
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
	.publish {
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
	.publish:hover:not(:disabled) {
		background: #166fe0;
	}
	.publish:disabled {
		opacity: 0.65;
		cursor: wait;
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
