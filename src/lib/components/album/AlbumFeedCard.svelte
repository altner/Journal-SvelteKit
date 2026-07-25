<script lang="ts">
	import AlbumPhotoGrid from './AlbumPhotoGrid.svelte';
	import DeleteAlbumButton from './DeleteAlbumButton.svelte';
	import OwnerActions from '../shared/OwnerActions.svelte';

	let {
		event,
		user,
		afterDelete,
		priority = false
	}: {
		event: {
			id: string;
			slug: string | null;
			title: string;
			description: string | null;
			isNew: boolean;
			sortDate: Date | string;
			anchorId?: string | null;
			photos: { id: string; filename: string; width: number | null; height: number | null }[];
		};
		user: App.Locals['user'];
		afterDelete?: () => void;
		priority?: boolean;
	} = $props();

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const href = $derived(`/albums/${event.slug ?? event.id}`);
	const updateLabel = $derived(
		event.photos.length === 1
			? `Ein neues Foto zum Album „${event.title}“ wurde hinzugefügt`
			: `${event.photos.length} neue Fotos zum Album „${event.title}“ wurden hinzugefügt`
	);
</script>

<article class="card album" id={event.anchorId ?? undefined}>
	<div class="album-header">
		<div class="album-meta">
			<h2 class="album-title">
				{#if event.isNew}
					<a {href}>📁 {event.title}</a>
				{:else}
					<a {href}>{updateLabel}</a>
				{/if}
			</h2>
			<div class="album-sub">
				<span>{formatDate(event.sortDate)}</span>
			</div>
		</div>
		{#if user && event.isNew}
			<OwnerActions label="Albumaktionen">
				<DeleteAlbumButton albumSlug={event.slug ?? event.id} {afterDelete} />
			</OwnerActions>
		{/if}
	</div>

	{#if event.isNew && event.description}
		<p class="album-description">{event.description}</p>
	{/if}

	{#if event.photos.length > 0}
		<AlbumPhotoGrid albumSlug={event.slug ?? event.id} photos={event.photos} {priority} />
	{/if}
</article>

<style>
	.album-header {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 12px 16px 0 16px;
	}
	.album-meta {
		flex: 1;
	}
	.album-title {
		margin: 0;
		font-weight: 600;
		font-size: 15px;
		line-height: 1.3;
	}
	.album-title a {
		color: inherit;
		text-decoration: none;
	}
	.album-title a:hover {
		text-decoration: underline;
	}
	.album-sub {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.album-description {
		padding: 8px 16px 0;
		font-size: 15px;
		line-height: 1.35;
		white-space: pre-wrap;
	}
</style>
