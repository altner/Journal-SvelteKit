<script lang="ts">
	import type { PageData } from './$types';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import PostComposer from '$lib/components/PostComposer.svelte';
	import DeletePostButton from '$lib/components/DeletePostButton.svelte';
	import EditPostForm from '$lib/components/EditPostForm.svelte';
	let { data }: { data: PageData } = $props();

	let editingId = $state<string | null>(null);

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
	<title>achis.blog</title>
</svelte:head>

<div class="page feed">
	{#if data.user}
		<PostComposer />
	{/if}

	{#if data.posts.length === 0}
		<p class="empty">
			{#if data.user}
				Noch keine Posts.
			{:else}
				Noch keine Posts. <a href="/posts/new">Leg los</a>.
			{/if}
		</p>
	{/if}

	{#each data.posts as p (p.id)}
		<article class="card post">
			<div class="post-header">
				<div class="post-meta">
					{#if editingId !== p.id}
						<div class="post-title">{p.title || 'Ohne Titel'}</div>
					{/if}
					<div class="post-sub">
						<a href="/posts/{p.id}">{formatDate(p.createdAt)}</a>
						{#if p.album}
							<span>·</span>
							<a href="/albums/{p.album.id}">📁 {p.album.title}</a>
						{/if}
					</div>
				</div>
				{#if data.user}
					<div class="post-actions">
						{#if !p.isStatusPost && editingId !== p.id}
							<button
								type="button"
								class="edit-btn"
								onclick={() => (editingId = p.id)}
							>
								Bearbeiten
							</button>
						{/if}
						<DeletePostButton postId={p.id} />
					</div>
				{/if}
			</div>

			{#if editingId === p.id}
				<EditPostForm
					postId={p.id}
					title={p.title}
					text={p.text}
					onSaved={() => (editingId = null)}
					onCancel={() => (editingId = null)}
				/>
			{:else if p.text}
				<div class="post-text">{p.text}</div>
			{/if}

			<PhotoGrid photos={p.album && p.album.originPostId === p.id ? p.album.photos : p.photos} />
		</article>
	{/each}
</div>

<style>
	.feed {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.empty {
		text-align: center;
		color: var(--fb-gray);
		margin-top: 40px;
	}
	.empty a {
		color: var(--fb-blue);
		font-weight: 600;
	}
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
</style>
