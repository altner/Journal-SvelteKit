<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import TrackMap from '$lib/components/TrackMap.svelte';
	import ActivityPhotoGrid from '$lib/components/ActivityPhotoGrid.svelte';
	import DeleteActivityButton from '$lib/components/DeleteActivityButton.svelte';
	import EditActivityForm from '$lib/components/EditActivityForm.svelte';
	import { sportIcon, formatDistance, formatDuration, formatElevation } from '$lib/activityFormat';
	import { formatWeatherSummary } from '$lib/weather';
	import OwnerActions from '$lib/components/OwnerActions.svelte';
	import { tick } from 'svelte';

	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let articleElement: HTMLElement | undefined = $state();

	const headTitle = $derived(`${data.activity.title} · achis.blog`);
	const elevation = $derived(formatElevation(data.activity.elevationGainMeters));
	const weather = $derived(formatWeatherSummary(data.activity));

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function startEditing(event: MouseEvent) {
		(event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
		editing = true;
	}

	async function finishEditing() {
		editing = false;
		await tick();
		articleElement?.querySelector<HTMLElement>('summary[aria-label="Aktivitätsaktionen"]')?.focus();
	}
</script>

<svelte:head>
	<title>{headTitle}</title>
	{#if data.description}<meta name="description" content={data.description} />{/if}
	<link rel="canonical" href={data.canonicalUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={headTitle} />
	{#if data.description}<meta property="og:description" content={data.description} />{/if}
	<meta property="og:url" content={data.canonicalUrl} />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<div class="page">
	<a class="back" href="/activities">← Alle Aktivitäten</a>

	<article bind:this={articleElement} class="card">
		{#if editing}
			<h1 class="title edit-title"><span aria-hidden="true">{sportIcon(data.activity.sport)}</span> {data.activity.title}</h1>
			<EditActivityForm
				activitySlug={data.activity.slug ?? data.activity.id}
				title={data.activity.title}
				sport={data.activity.sport}
				tags={data.activity.tags.map((t) => t.name)}
				onSaved={finishEditing}
				onCancel={finishEditing}
			/>
		{:else}
			<div class="header">
				<div>
					<h1 class="title"><span aria-hidden="true">{sportIcon(data.activity.sport)}</span> {data.activity.title}</h1>
					<div class="sub">{formatDate(data.activity.startedAt)}</div>
					{#if weather}<div class="weather">{weather}</div>{/if}
				</div>
				{#if data.user}
					<OwnerActions label="Aktivitätsaktionen">
						<button type="button" class="edit-btn" onclick={startEditing}
							>Bearbeiten</button
						>
						<DeleteActivityButton
							activitySlug={data.activity.slug ?? data.activity.id}
							afterDelete={() => goto('/activities')}
						/>
					</OwnerActions>
				{/if}
			</div>

			{#if data.activity.tags.length > 0}
				<div class="tags">
					{#each data.activity.tags as t (t.id)}
						<a class="tag-pill" href="/tags/{t.slug}">{t.name}</a>
					{/each}
				</div>
			{/if}

			<div class="stats">
				<div class="stat">
					<span class="value">{formatDistance(data.activity.distanceMeters)}</span>
					<span class="label">Distanz</span>
				</div>
				<div class="stat">
					<span class="value">{formatDuration(data.activity.durationSeconds)}</span>
					<span class="label">Dauer</span>
				</div>
				{#if elevation}
					<div class="stat">
						<span class="value">{elevation}</span>
						<span class="label">Höhengewinn</span>
					</div>
				{/if}
			</div>

			{#if data.activity.trackPoints.length > 0}
				<TrackMap points={data.activity.trackPoints} />
			{/if}

			{#if data.activity.photos.length > 0}
				<div class="activity-photos">
					<ActivityPhotoGrid
						photos={data.activity.photos}
						activitySlug={data.activity.slug ?? data.activity.id}
						priority
					/>
				</div>
			{/if}
		{/if}
	</article>
</div>

<style>
	.activity-photos {
		margin-top: 12px;
	}
	.back {
		font-size: 13px;
		color: var(--fb-gray);
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		margin-bottom: 12px;
	}
	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		padding: 16px 16px 0 16px;
	}
	.edit-btn {
		background: none;
		border: none;
		color: var(--fb-gray);
		font-size: 13px;
		cursor: pointer;
		padding: 8px 10px;
	}
	.edit-btn:hover {
		color: var(--fb-blue);
		text-decoration: underline;
	}
	.title {
		margin: 0;
		font-weight: 600;
		font-size: 20px;
	}
	.edit-title {
		padding: 16px 16px 0;
	}
	.sub {
		font-size: 13px;
		color: var(--fb-gray);
		margin-top: 2px;
	}
	.weather {
		font-size: 13px;
		color: var(--fb-gray);
		margin-top: 2px;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 8px 16px 0 16px;
	}
	.tag-pill {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		background: var(--fb-hover);
		color: var(--fb-blue);
		font-size: 12px;
		font-weight: 600;
		padding: 6px 12px;
		border-radius: 22px;
		text-decoration: none;
	}
	.stats {
		display: flex;
		gap: 24px;
		padding: 16px;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.stat .value {
		font-size: 18px;
		font-weight: 700;
	}
	.stat .label {
		font-size: 12px;
		color: var(--fb-gray);
	}
</style>
