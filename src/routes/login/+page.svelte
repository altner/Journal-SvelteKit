<script lang="ts">
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Anmelden · achis.blog</title>
</svelte:head>

<div class="auth-wrap">
	<form method="POST" class="auth-card">
		<h1>Anmelden</h1>

		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		<label>
			E-Mail
			<input type="email" name="email" required autocomplete="username" />
		</label>

		<label>
			Passwort
			<input type="password" name="password" required autocomplete="current-password" />
		</label>

		<button type="submit">Einloggen</button>
	</form>
</div>

<style>
	.auth-wrap {
		min-height: 100vh;
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
