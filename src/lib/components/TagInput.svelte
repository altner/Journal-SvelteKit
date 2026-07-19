<script lang="ts">
	import { untrack } from 'svelte';

	let { name = 'tags', initialTags = [] }: { name?: string; initialTags?: string[] } = $props();

	// Only the initial value matters here — later prop changes shouldn't clobber chips the user
	// is actively editing.
	let tags = $state<string[]>(untrack(() => [...initialTags]));
	let draft = $state('');

	function commitDraft() {
		const value = draft.trim();
		draft = '';
		if (!value) return;
		if (!tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
			tags = [...tags, value];
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commitDraft();
		} else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
			tags = tags.slice(0, -1);
		}
	}

	function removeTag(index: number) {
		tags = tags.filter((_, i) => i !== index);
	}

	export function reset() {
		tags = [];
		draft = '';
	}
</script>

<div class="tag-input">
	{#each tags as t, i (t)}
		<span class="chip">
			{t}
			<button
				type="button"
				class="chip-remove"
				onclick={() => removeTag(i)}
				aria-label="Tag {t} entfernen">×</button
			>
		</span>
	{/each}
	<input
		type="text"
		class="tag-draft"
		placeholder="Tag hinzufügen…"
		bind:value={draft}
		onkeydown={onKeydown}
		onblur={commitDraft}
	/>
</div>
<input type="hidden" {name} value={tags.join(',')} />

<style>
	.tag-input {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		padding: 6px 8px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: var(--fb-hover);
		color: var(--fb-blue);
		font-size: 13px;
		font-weight: 600;
		padding: 4px 8px;
		border-radius: 14px;
	}
	.chip-remove {
		background: none;
		border: none;
		color: var(--fb-gray);
		cursor: pointer;
		font-size: 14px;
		line-height: 1;
		padding: 0;
	}
	.tag-draft {
		border: none;
		outline: none;
		flex: 1;
		min-width: 100px;
		font-size: 14px;
		font-family: inherit;
	}
</style>
