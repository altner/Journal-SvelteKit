<script lang="ts">
	import PhotoGrid from '../photo/PhotoGrid.svelte';
	import DeletePostButton from './DeletePostButton.svelte';
	import EditPostForm from './EditPostForm.svelte';
	import OwnerActions from '../shared/OwnerActions.svelte';
	import { renderMarkdownToSafeHtml } from '$lib/markdown';
	import { tick } from 'svelte';

	type Photo = { id: string; filename: string; postId: string; excludeFromStream: boolean | null; width: number | null; height: number | null };
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
			tags: { id: string; name: string; slug: string }[];
			latitude: number | null;
			longitude: number | null;
			locationPlace: string | null;
			locationCountry: string | null;
			locationName: string | null;
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

	function formatLocation(p: {
		locationName: string | null;
		locationPlace: string | null;
		locationCountry: string | null;
	}) {
		const placeAndCountry = [p.locationPlace, p.locationCountry].filter(Boolean).join(', ');
		return [p.locationName, placeAndCountry].filter(Boolean).join(' · ');
	}

	function isExcludedBlock(block: Block) {
		return block.type === 'photos' && block.photos.length > 0 && block.photos.every((p) => !!p.excludeFromStream);
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
						excludeFromStream: isExcludedBlock(b)
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
		articleElement?.querySelector<HTMLElement>('summary[aria-label="Beitragsaktionen"]')?.focus();
	}
</script>

<article bind:this={articleElement} class="card post" id={post.anchorId ?? undefined}>
	<div class="post-header">
		<div class="post-meta">
			{#if headingLevel === 1}
				<h1 class="post-title detail-title">{post.title || 'Ohne Titel'}</h1>
			{:else if !editing}
					<h2 class="post-title">
						<a href="/posts/{post.slug ?? post.id}">{post.title || 'Ohne Titel'}</a>
					</h2>
			{/if}
			<div class="post-sub">
				<span>{formatDate(post.createdAt)}</span>
			</div>
			{#if post.latitude != null && post.longitude != null}
				<div class="post-location">
					<a
						class="location-pill"
						href={`https://www.openstreetmap.org/?mlat=${post.latitude}&mlon=${post.longitude}#map=16/${post.latitude}/${post.longitude}`}
						target="_blank"
						rel="noopener noreferrer">📍 {formatLocation(post)}</a
					>
				</div>
			{/if}
			{#if post.tags.length > 0}
				<div class="post-tags">
					{#each post.tags as t (t.id)}
						<a class="tag-pill" href="/tags/{t.slug}">{t.name}</a>
					{/each}
				</div>
			{/if}
		</div>
		{#if user}
			<OwnerActions label="Beitragsaktionen">
				{#if !editing}
					<button type="button" class="edit-btn" onclick={startEditing}>Bearbeiten</button>
				{/if}
				<DeletePostButton postSlug={post.slug ?? post.id} {afterDelete} />
			</OwnerActions>
		{/if}
	</div>

	{#if editing}
		<EditPostForm
			postSlug={post.slug ?? post.id}
			title={post.title}
			blocks={editableBlocks()}
			tags={post.tags.map((t) => t.name)}
			location={post.latitude != null && post.longitude != null
				? {
						latitude: post.latitude,
						longitude: post.longitude,
						locationPlace: post.locationPlace,
						locationCountry: post.locationCountry,
						locationName: post.locationName
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
				<PhotoGrid photos={block.photos} priority={priority && block.id === firstVisiblePhotoBlockId} />
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
	.post-sub {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
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
	.post-location {
		margin: 4px 0 4px 0;
	}
	.location-pill {
		color: var(--fb-gray);
		font-size: 12px;
	}
	.location-pill:hover {
		color: var(--fb-blue);
		text-decoration: underline;
	}
	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 4px;
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
	.tag-pill:hover {
		background: var(--fb-border);
	}
</style>
