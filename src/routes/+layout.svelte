<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/app.css';
	import { page } from '$app/state';
	import Footer from '$lib/components/Footer.svelte';

	let { children, data } = $props();

	const navItems = [
		{ href: '/', label: 'Feed' },
		{ href: '/photos', label: 'Fotos' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="topnav">
	<div class="topnav-inner">
		<span class="brand">📓 achis.blog</span>
		<div class="nav-links">
			{#each navItems as item (item.href)}
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

{@render children()}

<Footer />

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
</style>
