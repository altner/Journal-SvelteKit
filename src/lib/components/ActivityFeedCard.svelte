<script lang="ts">
	import TrackMap from './TrackMap.svelte';
	import ActivityPhotoGrid from './ActivityPhotoGrid.svelte';
	import DeleteActivityButton from './DeleteActivityButton.svelte';
	import EditActivityForm from './EditActivityForm.svelte';
	import OwnerActions from './OwnerActions.svelte';
	import { sportIcon, formatDistance, formatDuration, formatElevation } from '$lib/activityFormat';
	import { formatWeatherSummary } from '$lib/weather';
	import { tick } from 'svelte';

	let {
		activity,
		user,
		editing = false,
		onEdit,
		onEditDone,
		afterDelete,
		priority = false
	}: {
		activity: {
			id: string;
			slug: string | null;
			title: string;
			sport: string;
			distanceMeters: number;
			durationSeconds: number;
			elevationGainMeters: number | null;
			weatherTempC: number | null;
			weatherCode: number | null;
			weatherWindKph: number | null;
			weatherPrecipitationMm: number | null;
			startedAt: Date | string;
			trackPoints: [number, number][];
			tags: { id: string; name: string; slug: string }[];
			photos: { id: string; filename: string; width: number | null; height: number | null }[];
			anchorId?: string | null;
		};
		user: App.Locals['user'];
		editing?: boolean;
		onEdit?: () => void;
		onEditDone?: () => void;
		afterDelete?: () => void;
		priority?: boolean;
	} = $props();

	const elevation = $derived(formatElevation(activity.elevationGainMeters));
	const weather = $derived(formatWeatherSummary(activity));
	let articleElement: HTMLElement | undefined = $state();

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
		onEdit?.();
	}

	async function finishEditing() {
		onEditDone?.();
		await tick();
		articleElement?.querySelector<HTMLElement>('summary[aria-label="Aktivitätsaktionen"]')?.focus();
	}
</script>

<article bind:this={articleElement} class="card activity" id={activity.anchorId ?? undefined}>
	{#if editing}
		<EditActivityForm
			activitySlug={activity.slug ?? activity.id}
			title={activity.title}
			sport={activity.sport}
			tags={activity.tags.map((t) => t.name)}
			onSaved={finishEditing}
			onCancel={finishEditing}
		/>
	{:else}
		<div class="header">
			<div>
				<h2 class="title">
					<a href="/activities/{activity.slug ?? activity.id}">
						<span aria-hidden="true">{sportIcon(activity.sport)}</span> {activity.title}
					</a>
				</h2>
				<div class="sub">{formatDate(activity.startedAt)}</div>
				{#if weather}<div class="weather">{weather}</div>{/if}
			</div>
			{#if user}
				<OwnerActions label="Aktivitätsaktionen">
					<button type="button" class="edit-btn" onclick={startEditing}>Bearbeiten</button>
					<DeleteActivityButton activitySlug={activity.slug ?? activity.id} {afterDelete} />
				</OwnerActions>
			{/if}
		</div>

		{#if activity.tags.length > 0}
			<div class="tags">
				{#each activity.tags as t (t.id)}
					<a class="tag-pill" href="/tags/{t.slug}">{t.name}</a>
				{/each}
			</div>
		{/if}

		<div class="stats">
			<div class="stat">
				<span class="value">{formatDistance(activity.distanceMeters)}</span>
				<span class="label">Distanz</span>
			</div>
			<div class="stat">
				<span class="value">{formatDuration(activity.durationSeconds)}</span>
				<span class="label">Dauer</span>
			</div>
			{#if elevation}
				<div class="stat">
					<span class="value">{elevation}</span>
					<span class="label">Höhengewinn</span>
				</div>
			{/if}
		</div>

		{#if activity.trackPoints.length > 0}
			<TrackMap points={activity.trackPoints} />
		{/if}

		{#if activity.photos.length > 0}
			<div class="activity-photos">
				<ActivityPhotoGrid photos={activity.photos} activitySlug={activity.slug ?? activity.id} {priority} />
			</div>
		{/if}
	{/if}
</article>

<style>
	.activity-photos {
		margin-top: 12px;
	}
	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		padding: 12px 16px 0 16px;
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
		font-size: 15px;
	}
	.title a {
		color: inherit;
		text-decoration: none;
	}
	.title a:hover {
		text-decoration: underline;
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
		padding: 12px 16px;
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
