<script lang="ts">
	import ConfirmDeleteButton from './ConfirmDeleteButton.svelte';

	let { albumSlug, afterDelete }: { albumSlug: string; afterDelete?: () => void } = $props();
</script>

<ConfirmDeleteButton
	action="/albums/{albumSlug}?/deleteAlbum"
	label="Album löschen"
	question="Dieses Album inklusive aller Fotos wirklich löschen?"
	deletingLabel="Album wird gelöscht…"
	failureMessage="Das Album konnte nicht gelöscht werden. Bitte versuche es erneut."
	{afterDelete}
/>
