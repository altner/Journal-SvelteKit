<script lang="ts">
	let {
		pagination
	}: {
		pagination: { newer: string | null; older: string | null };
	} = $props();
</script>

{#if pagination.newer || pagination.older}
	<nav class="pagination" aria-label="Seitennavigation">
		{#if pagination.newer}
			<a href={pagination.newer}>← Neuere</a>
		{:else}
			<span></span>
		{/if}
		{#if pagination.older}
			<a href={pagination.older}>Ältere →</a>
		{/if}
	</nav>
{/if}

<style>
	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 40px;
		margin-top: 4px;
	}

	.pagination a {
		font-size: 14px;
		font-weight: 600;
	}
</style>
