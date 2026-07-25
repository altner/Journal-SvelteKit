<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const startUrl = $derived(`/login/start?redirectTo=${encodeURIComponent(data.redirectTo)}`);
</script>

<svelte:head>
	<title>Anmelden · achis.blog</title>
</svelte:head>

<div class="auth-wrap">
	<div class="auth-card">
		<a class="back" href={data.redirectTo}>← Zurück</a>
		<h1>Anmelden</h1>

		{#if data.error}
			<p class="error" role="alert">{data.error}</p>
		{/if}

		<a class="indieauth-btn" href={startUrl}>Mit IndieAuth anmelden</a>
	</div>
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
	.indieauth-btn {
		margin-top: 8px;
		background: var(--fb-blue);
		color: #fff;
		border: none;
		border-radius: 6px;
		min-height: 44px;
		padding: 10px 0;
		font-size: 16px;
		font-weight: 600;
		text-align: center;
		text-decoration: none;
	}
	.indieauth-btn:hover {
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
	@media (min-width: 1024px) {
		.auth-wrap {
			min-height: 100vh;
		}
	}
</style>
