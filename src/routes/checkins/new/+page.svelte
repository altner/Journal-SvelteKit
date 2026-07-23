<script lang="ts">
	import CheckinComposer from '$lib/components/CheckinComposer.svelte';
</script>

<svelte:head>
	<title>Neuer Checkin · achis.blog</title>
</svelte:head>

<div class="page">
	<h1>Neuer Checkin</h1>
	<CheckinComposer />
</div>

<style>
	h1 {
		font-size: 20px;
		margin: 0 0 14px 0;
	}
</style>
