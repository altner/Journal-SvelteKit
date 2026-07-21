<script lang="ts">
	import { enhance } from '$app/forms';

	let { activitySlug, afterDelete }: { activitySlug: string; afterDelete?: () => void } = $props();

	let error = $state<string | undefined>();

	function onSubmit(e: SubmitEvent) {
		if (!confirm('Diese Aktivität wirklich löschen?')) {
			e.preventDefault();
		}
	}
</script>

<form
	method="POST"
	action="/activities/{activitySlug}?/delete"
	class="delete-form"
	onsubmit={onSubmit}
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				error = result.data?.error as string | undefined;
				await update();
				return;
			}
			error = undefined;
			if (afterDelete) {
				afterDelete();
			} else {
				await update();
			}
		};
	}}
>
	{#if error}<span class="error">{error}</span>{/if}
	<button type="submit" class="delete-btn">Aktivität löschen</button>
</form>

<style>
	.delete-form {
		display: flex;
		align-items: center;
	}
	.delete-btn {
		background: none;
		border: none;
		color: var(--fb-gray);
		font-size: 13px;
		cursor: pointer;
		padding: 0;
	}
	.delete-btn:hover {
		color: #b3261e;
		text-decoration: underline;
	}
	.error {
		font-size: 12px;
		color: #b3261e;
	}
</style>
