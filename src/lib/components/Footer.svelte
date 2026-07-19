<script lang="ts">
	import { SOCIAL_PROFILES } from '$lib/consts';

	let { desktopRail = true }: { desktopRail?: boolean } = $props();
</script>

<footer class:hidden-desktop={!desktopRail}>
	<div class="footer-inner">
		<nav class="social-links" aria-label="Social Media">
			{#each SOCIAL_PROFILES as profile (profile.platform)}
				<a href={profile.href} rel={profile.rel} target="_blank">{profile.platform}</a>
			{/each}
		</nav>
		<nav class="legal-links" aria-label="Rechtliches">
			<a href="/impressum">Impressum</a>
			<a href="/datenschutz">Datenschutz</a>
		</nav>
	</div>
</footer>

<style>
	footer {
		border-top: 1px solid var(--fb-border);
		margin-top: 24px;
	}
	.footer-inner {
		max-width: 500px;
		margin: 0 auto;
		padding: 16px 16px 32px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		font-size: 12px;
		color: var(--fb-gray);
	}
	@media (min-width: 768px) {
		.footer-inner {
			max-width: 640px;
		}
	}
	@media (min-width: 1024px) {
		footer {
			border-top: none;
			margin-top: 0;
		}
		footer.hidden-desktop {
			display: none;
		}
		.footer-inner {
			max-width: none;
			margin: 0;
			padding: 0;
		}
	}
	.social-links,
	.legal-links {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
	}
	.legal-links a {
		font-weight: 600;
	}
	footer a {
		color: var(--fb-gray);
	}
	footer a:hover {
		text-decoration: underline;
	}
</style>
