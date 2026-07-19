<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import DeletePostButton from '$lib/components/DeletePostButton.svelte';
	import EditPostForm from '$lib/components/EditPostForm.svelte';
	let { data }: { data: PageData } = $props();

	let editing = $state(false);

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
	<title>{data.post.title || 'Post'} · achis.blog</title>
</svelte:head>

<div class="page">
	<a class="back" href="/">← Zum Feed</a>

	<article class="card post">
		<div class="post-header">
			<div class="post-meta">
				{#if !editing}
					<div class="post-title">{data.post.title || 'Ohne Titel'}</div>
				{/if}
				<div class="post-sub">
					<span>{formatDate(data.post.createdAt)}</span>
					{#if data.post.album}
						<span>·</span>
						<a href="/albums/{data.post.album.id}">📁 {data.post.album.title}</a>
					{/if}
				</div>
			</div>
			{#if data.user}
				<div class="post-actions">
					{#if !data.post.isStatusPost && !editing}
						<button type="button" class="edit-btn" onclick={() => (editing = true)}>
							Bearbeiten
						</button>
					{/if}
					<DeletePostButton postId={data.post.id} afterDelete={() => goto('/')} />
				</div>
			{/if}
		</div>

		{#if editing}
			<EditPostForm
				postId={data.post.id}
				title={data.post.title}
				text={data.post.text}
				onSaved={() => (editing = false)}
				onCancel={() => (editing = false)}
			/>
		{:else if data.post.text}
			<div class="post-text">{data.post.text}</div>
		{/if}

		<PhotoGrid
			photos={data.post.album && data.post.album.originPostId === data.post.id
				? data.post.album.photos
				: data.post.photos}
		/>
	</article>
</div>

<style>
	.back {
		font-size: 13px;
		color: var(--fb-gray);
		display: inline-block;
		margin-bottom: 12px;
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
