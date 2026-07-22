<script lang="ts">
	import { page } from '$app/state';

	const isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{isNotFound ? 'Seite nicht gefunden' : 'Fehler'} · achis.blog</title>
</svelte:head>

<div class="page error-page">
	<div class="card error-card">
		<div class="status" aria-hidden="true">{page.status}</div>
		<h1>{isNotFound ? 'Seite nicht gefunden' : 'Etwas ist schiefgelaufen'}</h1>
		<p>
			{isNotFound
				? 'Die gesuchte Seite existiert nicht oder wurde entfernt.'
				: 'Die Seite konnte gerade nicht geladen werden. Bitte versuche es später noch einmal.'}
		</p>
		<a class="home-link" href="/">Zurück zum Feed</a>
	</div>
</div>

<style>
	.error-page {
		display: grid;
		place-items: center;
		min-height: min(65vh, 520px);
	}

	.error-card {
		width: 100%;
		padding: 32px 24px;
		text-align: center;
	}

	.status {
		color: var(--fb-border);
		font-size: 48px;
		font-weight: 800;
		line-height: 1;
	}

	h1 {
		margin: 12px 0 8px;
		font-size: 22px;
	}

	p {
		margin: 0 auto 22px;
		max-width: 380px;
		color: var(--fb-gray);
		font-size: 15px;
		line-height: 1.45;
	}

	.home-link {
		display: inline-block;
		padding: 10px 16px;
		border-radius: 6px;
		background: var(--fb-blue);
		color: #fff;
		font-size: 14px;
		font-weight: 700;
	}

	.home-link:hover {
		background: #166fe0;
	}
</style>
