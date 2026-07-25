<script lang="ts">
	import ConfirmDeleteButton from './ConfirmDeleteButton.svelte';

	let { checkinSlug, afterDelete }: { checkinSlug: string; afterDelete?: () => void } = $props();
</script>

<ConfirmDeleteButton
	action="/checkins/{checkinSlug}?/delete"
	label="Checkin löschen"
	question="Diesen Checkin inklusive aller Fotos wirklich löschen?"
	deletingLabel="Checkin wird gelöscht…"
	failureMessage="Der Checkin konnte nicht gelöscht werden. Bitte versuche es erneut."
	{afterDelete}
/>
