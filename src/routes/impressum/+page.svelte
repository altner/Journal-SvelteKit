<script lang="ts">
	import {
		CONTACT_NAME,
		CONTACT_STREET,
		CONTACT_CITY,
		CONTACT_COUNTRY,
		CONTACT_PHONE,
		CONTACT_EMAIL
	} from '$lib/consts';
</script>

<svelte:head>
	<title>Impressum · achis.blog</title>
</svelte:head>

<div class="page">
	<div class="card prose">
		<h1>Impressum</h1>

		<p>
			{CONTACT_NAME}<br />
			{CONTACT_STREET}<br />
			{CONTACT_CITY}<br />
			{CONTACT_COUNTRY}
		</p>

		<p>
			<strong>Telefon:</strong> {CONTACT_PHONE}<br />
			<strong>E-Mail:</strong> {CONTACT_EMAIL}
		</p>

		<hr />

		<h2>Verantwortlich für den Inhalt</h2>
		<p>Verantwortlich für den Inhalt dieser Website nach § 55 Abs. 2 RStV ist die oben genannte Person.</p>

		<hr />

		<h2>Datenschutz</h2>
		<p>Informationen zur Verarbeitung personenbezogener Daten findest du in der <a href="/datenschutz">Datenschutzerklärung</a>.</p>
	</div>
</div>

<style>
	.prose {
		padding: 24px 20px;
		max-width: 620px;
		margin: 0 auto;
	}
	h1 {
		font-size: 22px;
		margin: 0 0 16px 0;
	}
	h2 {
		font-size: 16px;
		margin: 0 0 8px 0;
	}
	p {
		font-size: 14px;
		line-height: 1.6;
		margin: 0 0 16px 0;
	}
	hr {
		border: none;
		border-top: 1px solid var(--fb-border);
		margin: 20px 0;
	}
	a {
		color: var(--fb-blue);
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
</style>
