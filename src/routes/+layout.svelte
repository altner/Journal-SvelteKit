<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/app.css';
	import { page } from '$app/state';
	import Footer from '$lib/components/Footer.svelte';
	import PostTimeline from '$lib/components/PostTimeline.svelte';

	let { children, data } = $props();

	const navItems = [
		{ href: '/', label: 'Feed' },
		{ href: '/photos', label: 'Fotos' },
		{ href: '/albums', label: 'Alben' },
		{ href: '/tags', label: 'Tags' }
	];

	const isLoginPage = $derived(page.url.pathname === '/login');
	const isFeedPage = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell" class:chrome-free-desktop={isLoginPage}>
	<nav class="topnav">
		<div class="topnav-inner">
			<span class="brand">📓 achis.blog</span>
			<div class="nav-links">
				{#each navItems.slice(0, 2) as item (item.href)}
					<a href={item.href} class:active={page.url.pathname === item.href}>{item.label}</a>
				{/each}
			</div>
			{#if data?.user}
				<form method="POST" action="/logout">
					<button type="submit" class="logout">Logout</button>
				</form>
			{/if}
		</div>
	</nav>

	{#if !isLoginPage}
		<aside class="sidebar-nav">
			<span class="brand">📓 achis.blog</span>
			{#each navItems as item (item.href)}
				<a href={item.href} class:active={page.url.pathname === item.href}>{item.label}</a>
			{/each}
			{#if data?.user}
				<form method="POST" action="/logout">
					<button type="submit" class="logout">Logout</button>
				</form>
			{/if}
		</aside>
	{/if}

	<div class="main-col">
		{@render children()}
	</div>

	<aside class="right-rail">
		{#if isFeedPage && page.data.clusters}
			<PostTimeline clusters={page.data.clusters} />
		{/if}
		<Footer desktopRail={!isLoginPage} />
	</aside>
</div>

<style>
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
		padding: 10px 16px;
		display: flex;
		align-items: center;
		gap: 16px;
	}
	@media (min-width: 768px) {
		.topnav-inner {
			max-width: 640px;
		}
	}
	.brand {
		font-weight: 700;
		color: var(--fb-blue);
		margin-right: 4px;
	}
	.nav-links {
		display: flex;
		gap: 12px;
		flex: 1;
		font-size: 14px;
		font-weight: 600;
		color: var(--fb-gray);
		flex-wrap: wrap;
	}
	.nav-links a.active {
		color: var(--fb-blue);
	}
	.logout {
		background: none;
		border: none;
		color: var(--fb-gray);
		font-size: 13px;
		cursor: pointer;
	}
	.logout:hover {
		text-decoration: underline;
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
		.sidebar-nav {
			display: flex;
			flex-direction: column;
			gap: 4px;
			grid-column: 1;
			position: sticky;
			top: 24px;
		}
		.sidebar-nav a {
			padding: 10px 12px;
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
			padding: 0 12px 12px 12px;
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
	}
</style>
