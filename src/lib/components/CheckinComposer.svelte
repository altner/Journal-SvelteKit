<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import { tick } from 'svelte';
	import LocationPicker from './LocationPicker.svelte';
	import BlockEditor from './BlockEditor.svelte';

	let photoCount = $state(0);
	let error = $state<string | undefined>();
	let submitting = $state(false);
	let dirty = $state(false);
	let contentExpanded = $state(false);
	let errorMessage: HTMLParagraphElement | undefined = $state();
	let locationPickerRef: ReturnType<typeof LocationPicker> | undefined = $state();
	let blockEditorRef: ReturnType<typeof BlockEditor> | undefined = $state();

	beforeNavigate(({ cancel, willUnload }) => {
		if (!dirty || submitting) return;
		if (willUnload) {
			cancel();
			return;
		}
		if (!confirm('Deinen noch nicht veröffentlichten Checkin verwerfen?')) cancel();
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
</script>

<form
	method="POST"
	action="/checkins/new"
	enctype="multipart/form-data"
	class="card checkin-form"
	aria-busy={submitting}
	oninput={() => (dirty = true)}
	onchange={() => (dirty = true)}
	use:enhance={() => {
		submitting = true;
		return async ({ result, update, formElement }) => {
			if (result.type === 'failure') {
				error = result.data?.error as string | undefined;
			} else if (result.type === 'error') {
				error = 'Der Checkin konnte nicht veröffentlicht werden. Bitte versuche es erneut.';
			} else {
				error = undefined;
				formElement.reset();
				photoCount = 0;
				locationPickerRef?.reset();
				blockEditorRef?.reset();
				contentExpanded = false;
				dirty = false;
				await tick();
				dateValue = todayLocalDate();
				timeValue = nowLocalTime();
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
	{#if error}
		<p bind:this={errorMessage} class="error" role="alert" tabindex="-1">{error}</p>
	{/if}

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

	<LocationPicker bind:this={locationPickerRef} startExpanded requirePoiName onChange={() => (dirty = true)} />

	<div class="content-toggle">
		<button
			type="button"
			onclick={() => (contentExpanded = !contentExpanded)}
			aria-expanded={contentExpanded}
		>
			{contentExpanded ? 'Text/Foto entfernen' : '+ Text/Foto hinzufügen (optional)'}
		</button>
		{#if contentExpanded}
			<BlockEditor bind:this={blockEditorRef} onPhotoCountChange={(n) => (photoCount = n)} />
		{/if}
	</div>

	<button type="submit" class="publish" disabled={submitting}>
		{submitting ? 'Wird veröffentlicht…' : 'Checkin veröffentlichen'}
	</button>
</form>

<style>
	.checkin-form {
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
	.content-toggle {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.content-toggle > button {
		align-self: flex-start;
		background: none;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		min-height: 44px;
		padding: 6px 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--fb-blue);
		cursor: pointer;
	}
	.content-toggle > button:hover {
		background: var(--fb-hover);
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
