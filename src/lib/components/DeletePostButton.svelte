<script lang="ts">
	import ConfirmDeleteButton from './ConfirmDeleteButton.svelte';

	let {
		postSlug,
		basePath = '/posts',
		afterDelete
	}: { postSlug: string; basePath?: '/posts' | '/checkins'; afterDelete?: () => void } = $props();
</script>

<ConfirmDeleteButton
	action="{basePath}/{postSlug}?/delete"
	label="Beitrag löschen"
	question="Diesen Beitrag inklusive aller Fotos wirklich löschen?"
	deletingLabel="Beitrag wird gelöscht…"
	failureMessage="Der Beitrag konnte nicht gelöscht werden. Bitte versuche es erneut."
	{afterDelete}
/>
