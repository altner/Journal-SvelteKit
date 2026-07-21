<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import TrackMap from '$lib/components/TrackMap.svelte';
	import ActivityPhotoGrid from '$lib/components/ActivityPhotoGrid.svelte';
	import DeleteActivityButton from '$lib/components/DeleteActivityButton.svelte';
	import EditActivityForm from '$lib/components/EditActivityForm.svelte';
	import { sportIcon, formatDistance, formatDuration, formatElevation } from '$lib/activityFormat';

	let { data }: { data: PageData } = $props();

	let editing = $state(false);

	const headTitle = $derived(`${data.activity.title} · achis.blog`);
	const elevation = $derived(formatElevation(data.activity.elevationGainMeters));

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
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

	<article class="card">
		{#if editing}
			<EditActivityForm
				activitySlug={data.activity.slug ?? data.activity.id}
				title={data.activity.title}
				sport={data.activity.sport}
				tags={data.activity.tags.map((t) => t.name)}
				onSaved={() => (editing = false)}
				onCancel={() => (editing = false)}
			/>
		{:else}
			<div class="header">
				<div>
					<div class="title">{sportIcon(data.activity.sport)} {data.activity.title}</div>
					<div class="sub">{formatDate(data.activity.startedAt)}</div>
				</div>
				{#if data.user}
					<div class="actions">
						<button type="button" class="edit-btn" onclick={() => (editing = true)}
							>Bearbeiten</button
						>
						<DeleteActivityButton
							activitySlug={data.activity.slug ?? data.activity.id}
							afterDelete={() => goto('/activities')}
						/>
					</div>
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
		display: inline-block;
		margin-bottom: 12px;
	}
	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		padding: 16px 16px 0 16px;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.edit-btn {
		background: none;
		border: none;
		color: var(--fb-gray);
		font-size: 13px;
		cursor: pointer;
		padding: 0;
	}
	.edit-btn:hover {
		color: var(--fb-blue);
		text-decoration: underline;
	}
	.title {
		font-weight: 600;
		font-size: 17px;
	}
	.sub {
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
		background: var(--fb-hover);
		color: var(--fb-blue);
		font-size: 12px;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 12px;
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
