<script lang="ts">
	import CheckinPhotoGrid from './CheckinPhotoGrid.svelte';
	import DeleteCheckinButton from './DeleteCheckinButton.svelte';
	import EditCheckinForm from './EditCheckinForm.svelte';
	import OwnerActions from '../shared/OwnerActions.svelte';
	import TrackMap from '../activity/TrackMap.svelte';
	import { renderMarkdownToSafeHtml } from '$lib/markdown';
	import { tick } from 'svelte';

	type Photo = { id: string; filename: string; checkinId: string; excludeFromStream: boolean | null; width: number | null; height: number | null };
	type Block =
		| { id: string; type: 'text'; text: string | null; photos: Photo[] }
		| { id: string; type: 'photos'; text: string | null; photos: Photo[] };

	let {
		post,
		user,
		editing = false,
		onEdit,
		onEditDone,
		afterDelete,
		priority = false,
		headingLevel = 2
	}: {
		post: {
			id: string;
			slug: string | null;
			title: string | null;
			createdAt: Date | string;
			anchorId?: string | null;
			blocks: Block[];
			latitude: number | null;
			longitude: number | null;
			locationPlace: string | null;
			locationCountry: string | null;
			locationName: string | null;
			locationUrl: string | null;
			road: string | null;
			houseNumber: string | null;
			postcode: string | null;
		};
		user: App.Locals['user'];
		editing?: boolean;
		onEdit?: () => void;
		onEditDone?: () => void;
		afterDelete?: () => void;
		priority?: boolean;
		headingLevel?: 1 | 2;
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

	// Checkins never repeat the location name in the pill — it's already shown in the title via
	// checkinTitle() below, so only place+country are shown here.
	function formatLocation(p: {
		locationPlace: string | null;
		locationCountry: string | null;
	}) {
		return [p.locationPlace, p.locationCountry].filter(Boolean).join(', ');
	}

	function checkinTitle(p: { locationName: string | null }) {
		return p.locationName ? `Eingecheckt: ${p.locationName}` : 'Eingecheckt';
	}

	const firstVisiblePhotoBlockId = $derived(
		post.blocks.find((block) => block.type === 'photos' && block.photos.length > 0)?.id ?? null
	);
	let articleElement: HTMLElement | undefined = $state();

	function editableBlocks() {
		return post.blocks.map((b) =>
			b.type === 'text'
				? { id: b.id, type: 'text' as const, text: b.text ?? '' }
				: {
						id: b.id,
						type: 'photos' as const,
						photos: b.photos,
						excludeFromStream: b.photos.length > 0 && b.photos.every((p) => !!p.excludeFromStream)
					}
		);
	}

	function startEditing(event: MouseEvent) {
		(event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
		onEdit?.();
	}

	async function finishEditing() {
		onEditDone?.();
		await tick();
		articleElement?.querySelector<HTMLElement>('summary[aria-label="Checkin-Aktionen"]')?.focus();
	}
</script>

<article bind:this={articleElement} class="card post" id={post.anchorId ?? undefined}>
	<div class="post-header" class:standalone={post.blocks.length === 0 && !editing}>
		<div class="post-meta">
			{#if headingLevel === 1}
				<h1 class="post-title detail-title">{post.title || checkinTitle(post)}</h1>
			{:else if !editing}
				<h2 class="post-title"><a href="/checkins/{post.slug ?? post.id}">{post.title || checkinTitle(post)}</a></h2>
			{/if}
			<div class="checkin-meta">
				<span class="checkin-badge">📍 Check-in</span>
				<span>·</span>
				<span>{formatDate(post.createdAt)}</span>
				{#if post.locationPlace || post.locationCountry}
					<span>·</span>
					<span>📍 {formatLocation(post)}</span>
				{/if}
			</div>
		</div>
		{#if user}
			<OwnerActions label="Checkin-Aktionen">
				{#if !editing}
					<button type="button" class="edit-btn" onclick={startEditing}>Bearbeiten</button>
				{/if}
				<DeleteCheckinButton checkinSlug={post.slug ?? post.id} {afterDelete} />
			</OwnerActions>
		{/if}
	</div>

	{#if post.latitude != null && post.longitude != null}
		<div class="checkin-address">
			{#if post.road}<p>{post.road}{post.houseNumber ? ` ${post.houseNumber}` : ''}</p>{/if}
			{#if post.postcode || post.locationPlace}
				<p>{[post.postcode, post.locationPlace].filter(Boolean).join(' ')}</p>
			{/if}
			{#if post.locationUrl}
				<p><a href={post.locationUrl} target="_blank" rel="noopener">Auf OSM ansehen</a></p>
			{/if}
		</div>
		<TrackMap
			points={[[post.latitude, post.longitude]]}
			containerLabel="Interaktive Standortkarte"
			singlePointLabel="Checkin-Standort"
		/>
	{/if}

	{#if editing}
		<EditCheckinForm
			checkinSlug={post.slug ?? post.id}
			title={post.title}
			blocks={editableBlocks()}
			location={post.latitude != null && post.longitude != null
				? {
						latitude: post.latitude,
						longitude: post.longitude,
						locationPlace: post.locationPlace,
						locationCountry: post.locationCountry,
						locationName: post.locationName,
						road: post.road,
						houseNumber: post.houseNumber,
						postcode: post.postcode
					}
				: null}
			onSaved={finishEditing}
			onCancel={finishEditing}
		/>
	{:else}
		{#each post.blocks as block (block.id)}
			{#if block.type === 'text'}
				{#if block.text?.trim()}
					<div class="post-text">{@html renderMarkdownToSafeHtml(block.text)}</div>
				{/if}
			{:else}
				<CheckinPhotoGrid photos={block.photos} priority={priority && block.id === firstVisiblePhotoBlockId} />
			{/if}
		{/each}
	{/if}
</article>

<style>
	.post-header {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 12px 16px 0 16px;
	}
	/* A checkin with no text/photo blocks has nothing after the header to give the card its
	   bottom breathing room — add it here instead so a content-less checkin doesn't look cut off. */
	.post-header.standalone {
		padding-bottom: 12px;
	}
	.post-meta {
		flex: 1;
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
	.post-title {
		margin: 0;
		font-weight: 600;
		font-size: 15px;
		line-height: 1.3;
	}
	.post-title.detail-title {
		font-size: 20px;
	}
	.post-title a {
		color: inherit;
		text-decoration: none;
	}
	.post-title a:hover {
		text-decoration: underline;
	}
	.post-text {
		padding: 12px 16px;
		font-size: 15px;
		line-height: 1.35;
	}
	.post-text :global(p) {
		margin: 0 0 0.6em 0;
	}
	.post-text :global(p:last-child) {
		margin-bottom: 0;
	}
	.post-text :global(ul),
	.post-text :global(ol) {
		margin: 0 0 0.6em 1.3em;
		padding: 0;
	}
	.post-text :global(blockquote) {
		margin: 0 0 0.6em 0;
		padding-left: 12px;
		border-left: 3px solid var(--fb-border);
		color: var(--fb-gray);
	}
	.post-text :global(a) {
		color: var(--fb-blue);
	}
	.checkin-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.checkin-badge {
		font-weight: 600;
		color: #31a24c;
	}
	.checkin-address {
		padding: 12px 16px;
		font-size: 14px;
		line-height: 1.4;
		color: var(--fb-gray);
	}
	.checkin-address p {
		margin: 0;
	}
</style>
