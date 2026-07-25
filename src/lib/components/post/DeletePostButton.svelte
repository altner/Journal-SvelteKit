<script lang="ts">
	import ConfirmDeleteButton from '../shared/ConfirmDeleteButton.svelte';

	let { postSlug, afterDelete }: { postSlug: string; afterDelete?: () => void } = $props();
</script>

<ConfirmDeleteButton
	action="/posts/{postSlug}?/delete"
	label="Beitrag löschen"
	question="Diesen Beitrag inklusive aller Fotos wirklich löschen?"
	deletingLabel="Beitrag wird gelöscht…"
	failureMessage="Der Beitrag konnte nicht gelöscht werden. Bitte versuche es erneut."
	{afterDelete}
/>
