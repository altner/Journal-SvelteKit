<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';

	let {
		action,
		label,
		question,
		deletingLabel,
		failureMessage,
		afterDelete
	}: {
		action: string;
		label: string;
		question: string;
		deletingLabel: string;
		failureMessage: string;
		afterDelete?: () => void;
	} = $props();

	let confirming = $state(false);
	let deleting = $state(false);
	let error = $state<string | undefined>();
	let initialButton: HTMLButtonElement | undefined = $state();
	let confirmButton: HTMLButtonElement | undefined = $state();

	async function beginConfirmation(event: MouseEvent) {
		event.preventDefault();
		confirming = true;
		error = undefined;
		await tick();
		confirmButton?.focus();
	}

	async function cancelConfirmation() {
		confirming = false;
		error = undefined;
		await tick();
		initialButton?.focus();
	}
</script>

<form
	method="POST"
	{action}
	class="delete-form"
	aria-busy={deleting}
	use:enhance={() => {
		deleting = true;
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				error = result.data?.error as string | undefined;
				deleting = false;
				await update();
				return;
			}
			if (result.type === 'error') {
				error = failureMessage;
				deleting = false;
				return;
			}

			error = undefined;
			if (afterDelete) {
				afterDelete();
			} else {
				await update();
				deleting = false;
			}
		};
	}}
>
	{#if error}<span class="error" role="alert">{error}</span>{/if}

	{#if confirming}
		<span class="question">{question}</span>
		<button type="button" class="cancel-btn" onclick={cancelConfirmation} disabled={deleting}>
			Abbrechen
		</button>
		<button bind:this={confirmButton} type="submit" class="confirm-btn" disabled={deleting}>
			{deleting ? deletingLabel : `Ja, ${label.toLowerCase()}`}
		</button>
	{:else}
		<button
			bind:this={initialButton}
			type="button"
			class="delete-btn"
			onclick={beginConfirmation}
		>
			{label}
		</button>
	{/if}
</form>

<style>
	.delete-form {
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}
	.delete-btn,
	.cancel-btn,
	.confirm-btn {
		background: none;
		border: none;
		color: var(--fb-gray);
		font-size: 13px;
		cursor: pointer;
		padding: 8px 10px;
	}
	.delete-btn:hover,
	.confirm-btn:hover {
		color: #b3261e;
	}
	.confirm-btn {
		color: #b3261e;
		font-weight: 600;
	}
	.cancel-btn:hover {
		color: var(--fb-blue);
	}
	button:disabled {
		opacity: 0.65;
		cursor: wait;
	}
	.question {
		padding: 8px 10px 4px;
		font-size: 12px;
		line-height: 1.35;
		color: #050505;
		white-space: normal;
	}
	.error {
		padding: 6px 10px;
		font-size: 12px;
		line-height: 1.35;
		color: #b3261e;
		white-space: normal;
	}
</style>
