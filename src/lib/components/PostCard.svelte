<script lang="ts">
	import PhotoGrid from './PhotoGrid.svelte';
	import DeletePostButton from './DeletePostButton.svelte';
	import EditPostForm from './EditPostForm.svelte';
	import { renderMarkdownToSafeHtml } from '$lib/markdown';

	type Photo = { id: string; filename: string; postId: string; excludeFromStream: boolean | null };
	type Block =
		| { id: string; type: 'text'; text: string | null; photos: Photo[] }
		| { id: string; type: 'photos'; text: string | null; photos: Photo[] };

	let {
		post,
		user,
		editing = false,
		onEdit,
		onEditDone,
		afterDelete
	}: {
		post: {
			id: string;
			title: string | null;
			createdAt: Date | string;
			isStatusPost: boolean;
			anchorId?: string | null;
			blocks: Block[];
			album: {
				id: string;
				title: string;
				originPostId: string | null;
				photos: { id: string; filename: string; postId: string }[];
			} | null;
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

	const isOrigin = $derived(post.album != null && post.album.originPostId === post.id);
	const firstAlbumBlockId = $derived(
		isOrigin ? post.blocks.find((b) => b.type === 'photos' && !isExcludedBlock(b))?.id ?? null : null
	);

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
</script>

<article class="card post" id={post.anchorId ?? undefined}>
	<div class="post-header">
		<div class="post-meta">
			{#if !editing}
				<div class="post-title">{post.title || 'Ohne Titel'}</div>
			{/if}
			<div class="post-sub">
				<a href="/posts/{post.id}">{formatDate(post.createdAt)}</a>
				{#if post.album}
					<span>·</span>
					<a href="/albums/{post.album.id}">📁 {post.album.title}</a>
				{/if}
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
			<div class="post-actions">
				{#if !post.isStatusPost && !editing}
					<button type="button" class="edit-btn" onclick={() => onEdit?.()}>Bearbeiten</button>
				{/if}
				<DeletePostButton postId={post.id} {afterDelete} />
			</div>
		{/if}
	</div>

	{#if editing}
		<EditPostForm
			postId={post.id}
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
			onSaved={() => onEditDone?.()}
			onCancel={() => onEditDone?.()}
		/>
	{:else}
		{#each post.blocks as block (block.id)}
			{#if block.type === 'text'}
				{#if block.text?.trim()}
					<div class="post-text">{@html renderMarkdownToSafeHtml(block.text)}</div>
				{/if}
			{:else if block.id === firstAlbumBlockId}
				<PhotoGrid photos={post.album?.photos ?? []} />
			{:else if !(isOrigin && !isExcludedBlock(block))}
				<PhotoGrid photos={block.photos} />
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
	.post-actions {
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
	.post-title {
		font-weight: 600;
		font-size: 15px;
		line-height: 1.3;
	}
	.post-sub {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.post-sub a {
		color: var(--fb-blue);
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
		margin-top: 4px;
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
		background: var(--fb-hover);
		color: var(--fb-blue);
		font-size: 12px;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 12px;
		text-decoration: none;
	}
	.tag-pill:hover {
		background: var(--fb-border);
	}
</style>
