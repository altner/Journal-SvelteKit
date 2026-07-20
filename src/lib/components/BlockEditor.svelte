<script lang="ts">
	import { untrack } from 'svelte';
	import TextBlockEditor from './TextBlockEditor.svelte';

	type EditableTextBlock = { id: string; type: 'text'; text: string };
	type EditablePhotoBlock = {
		id: string;
		type: 'photos';
		existingPhotos: { id: string; filename: string }[];
		excludeFromStream: boolean;
		fileCount: number;
	};
	type EditableBlock = EditableTextBlock | EditablePhotoBlock;

	type InitialBlock =
		| { id: string; type: 'text'; text: string }
		| { id: string; type: 'photos'; photos: { id: string; filename: string }[]; excludeFromStream: boolean };

	let {
		initialBlocks,
		onPhotoCountChange
	}: {
		initialBlocks?: InitialBlock[];
		onPhotoCountChange?: (nonExcludedCount: number) => void;
	} = $props();

	function freshTextBlock(): EditableTextBlock {
		return { id: crypto.randomUUID(), type: 'text', text: '' };
	}

	function mapInitial(initial: InitialBlock[]): EditableBlock[] {
		return initial.map((b) =>
			b.type === 'text'
				? { id: b.id, type: 'text', text: b.text }
				: {
						id: b.id,
						type: 'photos',
						existingPhotos: b.photos,
						excludeFromStream: b.excludeFromStream,
						fileCount: 0
					}
		);
	}

	// Only the initial value matters — later prop changes shouldn't clobber in-progress edits.
	let blocks = $state<EditableBlock[]>(
		untrack(() => (initialBlocks && initialBlocks.length > 0 ? mapInitial(initialBlocks) : [freshTextBlock()]))
	);

	let blocksMetaJson = $derived(
		JSON.stringify(
			blocks.map((b) =>
				b.type === 'text'
					? { id: b.id, type: 'text', text: b.text }
					: { id: b.id, type: 'photos', fileField: `photos_${b.id}`, excludeFromStream: b.excludeFromStream }
			)
		)
	);

	$effect(() => {
		const total = blocks.reduce((sum, b) => {
			if (b.type !== 'photos' || b.excludeFromStream) return sum;
			return sum + (b.existingPhotos.length > 0 ? b.existingPhotos.length : b.fileCount);
		}, 0);
		onPhotoCountChange?.(total);
	});

	function moveUp(i: number) {
		if (i === 0) return;
		[blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
	}
	function moveDown(i: number) {
		if (i === blocks.length - 1) return;
		[blocks[i], blocks[i + 1]] = [blocks[i + 1], blocks[i]];
	}
	function removeBlock(i: number) {
		blocks.splice(i, 1);
	}
	function addTextBlock() {
		blocks.push(freshTextBlock());
	}
	function addPhotoBlock() {
		blocks.push({ id: crypto.randomUUID(), type: 'photos', existingPhotos: [], excludeFromStream: false, fileCount: 0 });
	}
	function onFileInputChange(block: EditablePhotoBlock, e: Event) {
		block.fileCount = (e.currentTarget as HTMLInputElement).files?.length ?? 0;
	}

	export function reset() {
		blocks = [freshTextBlock()];
	}
</script>

<div class="block-editor">
	{#each blocks as block, i (block.id)}
		<div class="block">
			<div class="block-controls">
				<button type="button" onclick={() => moveUp(i)} disabled={i === 0} aria-label="Nach oben">↑</button>
				<button
					type="button"
					onclick={() => moveDown(i)}
					disabled={i === blocks.length - 1}
					aria-label="Nach unten">↓</button
				>
				<button type="button" class="remove" onclick={() => removeBlock(i)} aria-label="Block entfernen"
					>×</button
				>
			</div>

			{#if block.type === 'text'}
				<TextBlockEditor initialMarkdown={block.text} onChange={(md) => (block.text = md)} />
			{:else if block.existingPhotos.length > 0}
				<div class="existing-photos">
					{#each block.existingPhotos as p (p.id)}
						<img src="/uploads/{p.filename}" alt="" />
					{/each}
				</div>
				{#if block.excludeFromStream}
					<p class="hint">🚫 Nicht in /photos oder Album (Infografik)</p>
				{/if}
			{:else}
				<label>
					Fotos
					<input
						type="file"
						name="photos_{block.id}"
						accept="image/*"
						multiple
						onchange={(e) => onFileInputChange(block, e)}
					/>
				</label>
				<label class="checkbox-row">
					<input type="checkbox" bind:checked={block.excludeFromStream} />
					Nicht in /photos oder Album zeigen (z. B. Infografik)
				</label>
			{/if}
		</div>
	{/each}

	<div class="add-controls">
		<button type="button" onclick={addTextBlock}>+ Text</button>
		<button type="button" onclick={addPhotoBlock}>+ Fotos</button>
	</div>
</div>

<input type="hidden" name="blocksMeta" value={blocksMetaJson} />

<style>
	.block-editor {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.block {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-right: 30px;
	}
	.block-controls {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.block-controls button {
		background: none;
		border: 1px solid var(--fb-border);
		border-radius: 4px;
		width: 24px;
		height: 22px;
		font-size: 12px;
		color: var(--fb-gray);
		cursor: pointer;
		line-height: 1;
	}
	.block-controls button:hover:not(:disabled) {
		background: var(--fb-hover);
	}
	.block-controls button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.block-controls button.remove {
		color: #b3261e;
	}
	.existing-photos {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.existing-photos img {
		width: 72px;
		height: 72px;
		object-fit: cover;
		border-radius: 6px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--fb-gray);
	}
	.checkbox-row {
		flex-direction: row;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	input[type='file'] {
		font-size: 14px;
	}
	.hint {
		font-size: 12px;
		color: var(--fb-gray);
		margin: 0;
	}
	.add-controls {
		display: flex;
		gap: 8px;
	}
	.add-controls button {
		background: none;
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--fb-blue);
		cursor: pointer;
	}
	.add-controls button:hover {
		background: var(--fb-hover);
	}
</style>
