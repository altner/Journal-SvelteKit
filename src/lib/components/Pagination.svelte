<script lang="ts">
	let {
		pagination
	}: {
		pagination: { newer: string | null; older: string | null };
	} = $props();
</script>

{#if pagination.newer || pagination.older}
	<nav class="pagination" aria-label="Weitere Seiten">
		{#if pagination.newer}
			<a href={pagination.newer} rel="prev">← Neuere Einträge</a>
		{/if}
		{#if pagination.older}
			<a class="older" href={pagination.older} rel="next">Ältere Einträge →</a>
		{/if}
	</nav>
{/if}

<style>
	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 4px;
		gap: 12px;
	}

	.pagination a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 4px;
		font-size: 14px;
		font-weight: 600;
	}

	.pagination .older {
		margin-left: auto;
		text-align: right;
	}
</style>
