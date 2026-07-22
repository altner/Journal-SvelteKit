<script lang="ts">
	import '$lib/app.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import Footer from '$lib/components/Footer.svelte';
	import PostTimeline from '$lib/components/PostTimeline.svelte';

	let { children, data } = $props();

	// "Alben" bewusst nicht in der Navigation - erreichbar über den "Alben"-Tab auf /photos
	// (PhotoTabs.svelte).
	const navItems = [
		{ href: '/', label: 'Feed', sections: ['/'] },
		{ href: '/posts', label: 'Beiträge', sections: ['/posts'] },
		{ href: '/photos', label: 'Fotos', sections: ['/photos', '/albums'] },
		{ href: '/activities', label: 'Aktivitäten', sections: ['/activities'] },
		{ href: '/tags', label: 'Tags', sections: ['/tags'] }
	];

	function isActive(item: (typeof navItems)[number]) {
		return item.sections.some((section) =>
			section === '/'
				? page.url.pathname === '/'
				: page.url.pathname === section || page.url.pathname.startsWith(`${section}/`)
		);
	}

	const isLoginPage = $derived(page.url.pathname === '/login');
	const isFeedPage = $derived(page.url.pathname === '/');
	const loginHref = $derived(
		`/login?redirectTo=${encodeURIComponent(`${page.url.pathname}${page.url.search}${page.url.hash}`)}`
	);
	const currentLocation = $derived(`${page.url.pathname}${page.url.search}${page.url.hash}`);
	let mainContent: HTMLElement;

	afterNavigate(async ({ from, to }) => {
		// Der erste Seitenaufruf behält seinen natürlichen Fokus (z. B. das E-Mail-Feld im Login).
		if (!from || !to || to.url.hash) return;

		// Foto-Lightboxen ändern nur flach die URL. Ihre eigene Fokuslogik hat hier Vorrang.
		const sameRouteWithDifferentPath =
			from.route.id === to.route.id && from.url.pathname !== to.url.pathname;
		if (sameRouteWithDifferentPath) return;

		await tick();
		const activeElement = document.activeElement as HTMLElement | null;
		const focusStillInPersistentChrome =
			activeElement === document.body ||
			activeElement === document.documentElement ||
			activeElement === mainContent ||
			Boolean(activeElement?.closest('.topnav, .sidebar-nav, .mobile-nav, .site-footer'));
		// Zielseiten wie Login oder Editoren dürfen ihren passenderen Erstfokus behalten.
		if (!focusStillInPersistentChrome) return;
		mainContent.focus({ preventScroll: true });
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
	{#if !page.data.description}
		<meta name="description" content="my digital corner on the web" />
	{/if}
</svelte:head>

<a class="skip-link" href="#main-content">Zum Inhalt springen</a>

<div class="app-shell" class:chrome-free-desktop={isLoginPage}>
	<nav class="topnav" aria-label="Kopfzeile">
		<div class="topnav-inner">
			<a class="brand" href="/" aria-label="achis.blog – Startseite">📓 achis.blog</a>
			<div class="topnav-actions">
			{#if data?.user}
				<form method="POST" action="/logout">
					<input type="hidden" name="redirectTo" value={currentLocation} />
					<button type="submit" class="logout">Abmelden</button>
				</form>
			{:else if !isLoginPage}
				<a class="login-link" href={loginHref}>Anmelden</a>
			{/if}
			</div>
		</div>
	</nav>

	{#if !isLoginPage}
		<nav class="mobile-nav" aria-label="Hauptnavigation">
			{#each navItems as item (item.href)}
				<a href={item.href} class:active={isActive(item)} aria-current={isActive(item) ? 'page' : undefined}>
					{item.label}
				</a>
			{/each}
		</nav>
	{/if}

	{#if !isLoginPage}
		<aside class="sidebar-nav" aria-label="Hauptnavigation">
			<a class="brand" href="/" aria-label="achis.blog – Startseite">📓 achis.blog</a>
			{#each navItems as item (item.href)}
				<a href={item.href} class:active={isActive(item)} aria-current={isActive(item) ? 'page' : undefined}>
					{item.label}
				</a>
			{/each}
			{#if data?.user}
				<form method="POST" action="/logout">
					<input type="hidden" name="redirectTo" value={currentLocation} />
					<button type="submit" class="logout">Abmelden</button>
				</form>
			{:else}
				<a class="login-link desktop-login" href={loginHref}>Anmelden</a>
			{/if}
		</aside>
	{/if}

	<main bind:this={mainContent} class="main-col" id="main-content" tabindex="-1">
		{@render children()}
	</main>

	<aside class="right-rail">
		{#if isFeedPage && page.data.clusters}
			<PostTimeline clusters={page.data.clusters} />
		{/if}
	</aside>

	{#if !isLoginPage}
		<div class="site-footer">
			<Footer />
		</div>
	{/if}
</div>

<style>
	.skip-link {
		position: fixed;
		z-index: 3000;
		top: 8px;
		left: 8px;
		padding: 10px 14px;
		border-radius: 6px;
		background: #fff;
		color: var(--fb-blue);
		font-size: 14px;
		font-weight: 700;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		transform: translateY(calc(-100% - 16px));
	}
	.skip-link:focus {
		transform: translateY(0);
	}
	.topnav {
		background: #fff;
		border-bottom: 1px solid var(--fb-border);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.topnav-inner {
		max-width: 500px;
		margin: 0 auto;
		min-height: 48px;
		padding: 2px 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	@media (min-width: 768px) {
		.topnav-inner {
			max-width: 640px;
		}
	}
	.brand {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		flex: 0 0 auto;
		font-weight: 700;
		color: var(--fb-blue);
		white-space: nowrap;
	}
	.topnav-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		font-size: 14px;
		font-weight: 600;
	}
	.login-link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--fb-blue);
	}
	.topnav-actions form {
		display: flex;
	}
	.logout {
		min-height: 44px;
		padding: 0 4px;
		background: none;
		border: none;
		color: var(--fb-gray);
		font-size: 13px;
		cursor: pointer;
	}
	.logout:hover {
		text-decoration: underline;
	}
	.mobile-nav {
		position: fixed;
		z-index: 20;
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		background: #fff;
		border-top: 1px solid var(--fb-border);
		padding-bottom: env(safe-area-inset-bottom);
	}
	.mobile-nav a {
		display: grid;
		place-items: center;
		min-height: 48px;
		padding: 6px 1px;
		border-top: 2px solid transparent;
		text-align: center;
		font-size: 11px;
		font-weight: 600;
		color: var(--fb-gray);
	}
	.mobile-nav a.active {
		border-top-color: var(--fb-blue);
		color: var(--fb-blue);
	}
	.site-footer {
		padding-bottom: calc(48px + env(safe-area-inset-bottom));
	}

	.sidebar-nav {
		display: none;
	}

	@media (min-width: 1024px) {
		.app-shell {
			display: grid;
			grid-template-columns: 240px minmax(0, 680px) 280px;
			column-gap: 24px;
			max-width: 1240px;
			margin: 0 auto;
			padding: 24px 24px 48px 24px;
			align-items: start;
		}
		.app-shell.chrome-free-desktop {
			display: block;
		}
		.topnav {
			display: none;
		}
		.mobile-nav {
			display: none;
		}
		.sidebar-nav {
			display: flex;
			flex-direction: column;
			gap: 4px;
			grid-column: 1;
			position: sticky;
			top: 24px;
		}
		.sidebar-nav a {
			display: flex;
			align-items: center;
			min-height: 44px;
			padding: 8px 12px;
			border-radius: 6px;
			font-size: 15px;
			font-weight: 600;
			color: var(--fb-gray);
		}
		.sidebar-nav a:hover {
			background: var(--fb-hover);
		}
		.sidebar-nav a.active {
			color: var(--fb-blue);
		}
		.sidebar-nav .brand {
			font-size: 18px;
			padding: 0 12px;
		}
		.sidebar-nav .desktop-login {
			margin-top: 8px;
			color: var(--fb-blue);
		}
		.sidebar-nav form {
			padding: 0 12px;
		}
		.sidebar-nav .logout {
			padding: 0;
		}
		.main-col {
			grid-column: 2;
		}
		.right-rail {
			grid-column: 3;
			position: sticky;
			top: 24px;
			display: flex;
			flex-direction: column;
			gap: 16px;
		}
		.site-footer {
			grid-column: 1 / -1;
			margin-top: 24px;
			padding-bottom: 0;
		}
	}
</style>
