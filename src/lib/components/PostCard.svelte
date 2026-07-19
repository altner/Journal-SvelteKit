<script lang="ts">
	import PhotoGrid from './PhotoGrid.svelte';
	import DeletePostButton from './DeletePostButton.svelte';
	import EditPostForm from './EditPostForm.svelte';

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
			text: string | null;
			createdAt: Date | string;
			isStatusPost: boolean;
			anchorId?: string | null;
			photos: { id: string; filename: string; postId: string }[];
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
			text={post.text}
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
	{:else if post.text}
		<div class="post-text">{post.text}</div>
	{/if}

	<PhotoGrid
		photos={post.album && post.album.originPostId === post.id ? post.album.photos : post.photos}
	/>
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
		white-space: pre-wrap;
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
