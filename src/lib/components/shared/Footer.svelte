<script lang="ts">
	import { CONTACT_NAME } from '$lib/consts';

	const currentYear = new Date().getFullYear();
</script>

<footer>
	<div class="footer-inner">
		<div class="copyright">
			<span>© {currentYear} {CONTACT_NAME}</span>
			<a
				href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.de"
				target="_blank"
				rel="license noopener noreferrer"
			>CC BY-NC-ND 4.0</a>
		</div>
		<nav class="legal-links" aria-label="Rechtliches">
			<a href="/ueber-mich">Über mich</a>
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
	.copyright {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
	}
	@media (min-width: 768px) {
		.footer-inner {
			max-width: 640px;
		}
	}
	@media (min-width: 1024px) {
		footer {
			margin-top: 0;
		}
		.footer-inner {
			max-width: 680px;
			margin: 0 auto;
			padding: 16px 0 0;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
		.legal-links {
			justify-content: flex-end;
		}
	}
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
