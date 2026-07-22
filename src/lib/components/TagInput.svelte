<script lang="ts">
	import { tick, untrack } from 'svelte';

	let { name = 'tags', initialTags = [] }: { name?: string; initialTags?: string[] } = $props();

	// Only the initial value matters here — later prop changes shouldn't clobber chips the user
	// is actively editing.
	let tags = $state<string[]>(untrack(() => [...initialTags]));
	let draft = $state('');
	let announcement = $state('');
	let inputElement: HTMLInputElement;
	const componentId = $props.id();
	const inputId = `tag-input-${componentId}`;
	const hintId = `${inputId}-hint`;

	function commitDraft() {
		const values = draft
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		draft = '';
		if (values.length === 0) return;

		const added: string[] = [];
		for (const value of values) {
			if (
				!tags.some((tag) => tag.toLowerCase() === value.toLowerCase()) &&
				!added.some((tag) => tag.toLowerCase() === value.toLowerCase())
			) {
				added.push(value);
			}
		}

		if (added.length > 0) {
			tags = [...tags, ...added];
			announcement =
				added.length === 1 ? `Tag ${added[0]} hinzugefügt.` : `${added.length} Tags hinzugefügt.`;
		} else {
			announcement = 'Dieser Tag ist bereits vorhanden.';
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			commitDraft();
		} else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
			removeTag(tags.length - 1);
		}
	}

	async function removeTag(index: number) {
		const removed = tags[index];
		tags = tags.filter((_, i) => i !== index);
		announcement = `Tag ${removed} entfernt.`;
		await tick();
		inputElement.focus();
	}

	export function reset() {
		tags = [];
		draft = '';
	}
</script>

<div class="tag-field">
	<label for={inputId}>Tags</label>
	<div class="tag-input">
		{#each tags as t, i (t)}
			<button
				type="button"
				class="chip"
				onclick={() => removeTag(i)}
				aria-label="Tag {t} entfernen"
				title="Tag entfernen"
			>
				<span>{t}</span><span aria-hidden="true">×</span>
			</button>
		{/each}
		<input
			bind:this={inputElement}
			id={inputId}
			type="text"
			class="tag-draft"
			placeholder="Tag hinzufügen…"
			aria-describedby={hintId}
			bind:value={draft}
			onkeydown={onKeydown}
			onblur={commitDraft}
		/>
	</div>
	<span class="hint" id={hintId}>Mit Enter oder Komma hinzufügen.</span>
	<span class="sr-only" aria-live="polite">{announcement}</span>
</div>
<input type="hidden" {name} value={tags.join(',')} />

<style>
	.tag-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.tag-field > label {
		font-size: 13px;
		color: var(--fb-gray);
	}
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
		min-height: 44px;
		border: 0;
		background: var(--fb-hover);
		color: var(--fb-blue);
		font-size: 13px;
		font-weight: 600;
		padding: 6px 12px;
		border-radius: 22px;
		cursor: pointer;
		font-family: inherit;
	}
	.chip span:last-child {
		color: var(--fb-gray);
		font-size: 16px;
	}
	.tag-draft {
		border: none;
		outline: none;
		flex: 1;
		min-width: 100px;
		min-height: 44px;
		font-size: 14px;
		font-family: inherit;
	}
	.hint {
		font-size: 12px;
		color: var(--fb-gray);
	}
</style>
