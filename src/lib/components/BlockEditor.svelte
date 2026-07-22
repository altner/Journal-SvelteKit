<script lang="ts">
	import { untrack } from 'svelte';
	import TextBlockEditor from './TextBlockEditor.svelte';

	type EditableTextBlock = { id: string; type: 'text'; text: string };
	type EditablePhotoBlock = {
		id: string;
		type: 'photos';
		existingPhotos: { id: string; filename: string; width?: number | null; height?: number | null }[];
		excludeFromStream: boolean;
		fileCount: number;
	};
	type EditableBlock = EditableTextBlock | EditablePhotoBlock;

	type InitialBlock =
		| { id: string; type: 'text'; text: string }
		| { id: string; type: 'photos'; photos: { id: string; filename: string; width?: number | null; height?: number | null }[]; excludeFromStream: boolean };

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
		<div
			class="block"
			role="group"
			aria-label={`${block.type === 'text' ? 'Textblock' : 'Fotoblock'} ${i + 1}`}
		>
			<div class="block-controls" aria-label="Block anordnen oder entfernen">
				<span class="block-label" aria-hidden="true">
					{block.type === 'text' ? 'Textblock' : 'Fotoblock'} {i + 1}
				</span>
				<button
					type="button"
					onclick={() => moveUp(i)}
					disabled={i === 0}
					aria-label={`${block.type === 'text' ? 'Textblock' : 'Fotoblock'} ${i + 1} nach oben`}
					title="Nach oben"
				>↑</button>
				<button
					type="button"
					onclick={() => moveDown(i)}
					disabled={i === blocks.length - 1}
					aria-label={`${block.type === 'text' ? 'Textblock' : 'Fotoblock'} ${i + 1} nach unten`}
					title="Nach unten">↓</button
				>
				<button
					type="button"
					class="remove"
					onclick={() => removeBlock(i)}
					aria-label={`${block.type === 'text' ? 'Textblock' : 'Fotoblock'} ${i + 1} entfernen`}
					title="Block entfernen"
					>×</button
				>
			</div>

			{#if block.type === 'text'}
				<TextBlockEditor initialMarkdown={block.text} onChange={(md) => (block.text = md)} />
			{:else if block.existingPhotos.length > 0}
				<div class="existing-photos">
					{#each block.existingPhotos as p (p.id)}
						<img src="/uploads/{p.filename}" alt="" width={p.width ?? undefined} height={p.height ?? undefined} loading="lazy" decoding="async" />
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
		<button type="button" onclick={addTextBlock} aria-label="Textblock hinzufügen">+ Text</button>
		<button type="button" onclick={addPhotoBlock} aria-label="Fotoblock hinzufügen">+ Fotos</button>
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
	}
	.block-controls {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.block-label {
		margin-right: auto;
		font-size: 12px;
		font-weight: 600;
		color: var(--fb-gray);
	}
	.block-controls button {
		background: none;
		border: 1px solid var(--fb-border);
		border-radius: 4px;
		width: 44px;
		height: 44px;
		font-size: 16px;
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
		min-height: 44px;
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
		min-height: 44px;
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
