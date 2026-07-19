<script lang="ts">
	import PostComposer from '$lib/components/PostComposer.svelte';
</script>

<svelte:head>
	<title>Neuer Post · achis.blog</title>
</svelte:head>

<div class="page">
	<h1>Neuer Post</h1>
	<PostComposer />
</div>

<style>
	h1 {
		font-size: 20px;
		margin: 0 0 14px 0;
	}
</style>
