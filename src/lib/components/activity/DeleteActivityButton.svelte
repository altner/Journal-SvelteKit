<script lang="ts">
	import ConfirmDeleteButton from '../shared/ConfirmDeleteButton.svelte';

	let { activitySlug, afterDelete }: { activitySlug: string; afterDelete?: () => void } = $props();
</script>

<ConfirmDeleteButton
	action="/activities/{activitySlug}?/delete"
	label="Aktivität löschen"
	question="Diese Aktivität wirklich löschen?"
	deletingLabel="Aktivität wird gelöscht…"
	failureMessage="Die Aktivität konnte nicht gelöscht werden. Bitte versuche es erneut."
	{afterDelete}
/>
