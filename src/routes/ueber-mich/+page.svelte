<script lang="ts">
	import { SOCIAL_PROFILES } from '$lib/consts';
	import portraitAvif380 from '$lib/assets/me-380.avif';
	import portraitAvif760 from '$lib/assets/me-760.avif';
	import portraitWebp380 from '$lib/assets/me-380.webp';
	import portraitWebp760 from '$lib/assets/me-760.webp';

	const portraitAvifSrcset = `${portraitAvif380} 380w, ${portraitAvif760} 760w`;
	const portraitWebpSrcset = `${portraitWebp380} 380w, ${portraitWebp760} 760w`;
</script>

<svelte:head>
	<title>Über mich · achis.blog</title>
	<meta name="description" content="Über mich und meine Profile im Web." />
</svelte:head>

<div class="page">
	<article class="card about">
		<picture>
			<source type="image/avif" srcset={portraitAvifSrcset} sizes="(max-width: 444px) calc(100vw - 80px), 380px" />
			<img
				class="portrait"
				src={portraitWebp380}
				srcset={portraitWebpSrcset}
				sizes="(max-width: 444px) calc(100vw - 80px), 380px"
				alt="Adrian Altner"
				width="760"
				height="1013"
				fetchpriority="high"
			/>
		</picture>

		<div class="content">
			<h1>Über mich</h1>
			<p>Hier findest du mich auch an anderen Orten im Web:</p>

			<nav class="profiles" aria-label="Social Media">
				{#each SOCIAL_PROFILES as profile (profile.platform)}
					<a href={profile.href} rel={profile.rel} target="_blank">
						<span>{profile.platform}</span>
						<span aria-hidden="true">↗</span>
					</a>
				{/each}
			</nav>
		</div>
	</article>
</div>

<style>
	.page {
		padding: 16px;
	}

	.about {
		padding: 24px;
		display: grid;
		gap: 24px;
	}

	.portrait {
		display: block;
		width: min(100%, 380px);
		height: auto;
		margin: 0 auto;
		border-radius: 10px;
	}

	picture {
		display: block;
	}

	.content {
		min-width: 0;
	}

	h1 {
		margin: 0 0 8px;
		font-size: 24px;
	}

	p {
		margin: 0 0 20px;
		color: var(--fb-gray);
	}

	.profiles {
		display: grid;
		gap: 8px;
	}

	.profiles a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border: 1px solid var(--fb-border);
		border-radius: 8px;
		font-weight: 600;
	}

	.profiles a:hover {
		background: var(--fb-hover);
		text-decoration: none;
	}
</style>
