<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, tick } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
	let unexpectedError = $state<string | undefined>();
	let emailInput: HTMLInputElement | undefined = $state();
	let passwordInput: HTMLInputElement | undefined = $state();
	let errorMessage: HTMLParagraphElement | undefined = $state();
	const loginError = $derived(unexpectedError ?? form?.error);

	onMount(() => emailInput?.focus());
</script>

<svelte:head>
	<title>Anmelden · achis.blog</title>
</svelte:head>

<div class="auth-wrap">
	<form
		method="POST"
		class="auth-card"
		aria-busy={submitting}
		use:enhance={() => {
			submitting = true;
			unexpectedError = undefined;
			return async ({ result, update }) => {
				if (result.type === 'error') {
					unexpectedError = 'Die Anmeldung ist gerade nicht möglich. Bitte versuche es erneut.';
					submitting = false;
					await tick();
					errorMessage?.focus();
					return;
				}
				await update();
				submitting = false;
				if (result.type === 'failure') {
					await tick();
					const returnedEmail = String(result.data?.email ?? '');
					if (passwordInput) passwordInput.value = '';
					(returnedEmail ? passwordInput : emailInput)?.focus();
				}
			};
		}}
	>
		<a class="back" href={data.redirectTo}>← Zurück</a>
		<h1>Anmelden</h1>

		{#if loginError}
			<p bind:this={errorMessage} class="error" id="login-error" role="alert" tabindex="-1">{loginError}</p>
		{/if}

		<label>
			E-Mail
			<input
				bind:this={emailInput}
				type="email"
				name="email"
				value={form?.email ?? ''}
				required
				disabled={submitting}
				autocomplete="username"
				aria-invalid={loginError ? 'true' : undefined}
				aria-describedby={loginError ? 'login-error' : undefined}
			/>
		</label>

		<label>
			Passwort
			<input
				bind:this={passwordInput}
				type="password"
				name="password"
				required
				disabled={submitting}
				autocomplete="current-password"
				aria-invalid={loginError ? 'true' : undefined}
				aria-describedby={loginError ? 'login-error' : undefined}
			/>
		</label>

		<button type="submit" disabled={submitting}>
			{submitting ? 'Anmeldung läuft…' : 'Einloggen'}
		</button>
	</form>
</div>

<style>
	.auth-wrap {
		min-height: calc(100svh - 49px);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--fb-bg);
	}
	.auth-card {
		background: #fff;
		padding: 32px;
		border-radius: 8px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	h1 {
		font-size: 20px;
		margin: 0 0 4px 0;
	}
	.back {
		align-self: flex-start;
		font-size: 14px;
		font-weight: 600;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	input {
		padding: 10px 12px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		font-size: 15px;
	}
	button {
		margin-top: 8px;
		background: var(--fb-blue);
		color: #fff;
		border: none;
		border-radius: 6px;
		min-height: 44px;
		padding: 10px 0;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
	}
	button:hover {
		background: #166fe0;
	}
	button:disabled {
		cursor: wait;
		opacity: 0.7;
	}
	.error {
		background: #fde2e1;
		color: #b3261e;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		margin: 0;
	}
	@media (min-width: 1024px) {
		.auth-wrap {
			min-height: 100vh;
		}
	}
</style>
