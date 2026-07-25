<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor as TiptapEditor } from '@tiptap/core';

	let {
		initialMarkdown = '',
		onChange
	}: {
		initialMarkdown?: string;
		onChange: (markdown: string) => void;
	} = $props();

	let editorContainer = $state<HTMLDivElement>();
	let editor: TiptapEditor | undefined;
	let active = $state<Record<string, boolean>>({});
	let ready = $state(false);

	function updateActive() {
		if (!editor) return;
		active = {
			h2: editor.isActive('heading', { level: 2 }),
			h3: editor.isActive('heading', { level: 3 }),
			bold: editor.isActive('bold'),
			italic: editor.isActive('italic'),
			bulletList: editor.isActive('bulletList'),
			orderedList: editor.isActive('orderedList'),
			blockquote: editor.isActive('blockquote'),
			link: editor.isActive('link')
		};
	}

	onMount(() => {
		let destroyed = false;

		(async () => {
			const [{ Editor }, { default: StarterKit }, { Markdown }] = await Promise.all([
				import('@tiptap/core'),
				import('@tiptap/starter-kit'),
				import('tiptap-markdown')
			]);

			if (destroyed) return;

			editor = new Editor({
				element: editorContainer,
				editorProps: {
					attributes: {
						'aria-label': 'Beitragstext'
					}
				},
				extensions: [
					StarterKit.configure({
						heading: { levels: [2, 3] },
						link: { openOnClick: false, autolink: true }
					}),
					Markdown.configure({ html: false, bulletListMarker: '-' })
				],
				content: initialMarkdown,
				onUpdate: () => {
					onChange(
						(editor!.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown()
					);
					updateActive();
				},
				onSelectionUpdate: updateActive,
				onTransaction: updateActive
			});

			updateActive();
			ready = true;
		})();

		return () => {
			destroyed = true;
		};
	});

	onDestroy(() => {
		editor?.destroy();
	});

	function toggleHeading(level: 2 | 3) {
		editor?.chain().focus().toggleHeading({ level }).run();
	}
	function toggleBold() {
		editor?.chain().focus().toggleBold().run();
	}
	function toggleItalic() {
		editor?.chain().focus().toggleItalic().run();
	}
	function toggleBulletList() {
		editor?.chain().focus().toggleBulletList().run();
	}
	function toggleOrderedList() {
		editor?.chain().focus().toggleOrderedList().run();
	}
	function toggleBlockquote() {
		editor?.chain().focus().toggleBlockquote().run();
	}
	function setLink() {
		if (!editor) return;
		const previousUrl = editor.getAttributes('link').href as string | undefined;
		const url = window.prompt('Link-URL', previousUrl ?? 'https://');
		if (url === null) return;
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	}
</script>

<div class="text-block-editor">
	<div class="toolbar" role="group" aria-label="Text formatieren">
		<button type="button" class:active={active.h2} aria-pressed={active.h2} aria-label="Überschrift 2" title="Überschrift 2" disabled={!ready} onclick={() => toggleHeading(2)}>H2</button>
		<button type="button" class:active={active.h3} aria-pressed={active.h3} aria-label="Überschrift 3" title="Überschrift 3" disabled={!ready} onclick={() => toggleHeading(3)}>H3</button>
		<button type="button" class:active={active.bold} aria-pressed={active.bold} aria-label="Fett" title="Fett" disabled={!ready} onclick={toggleBold}><strong>B</strong></button>
		<button type="button" class:active={active.italic} aria-pressed={active.italic} aria-label="Kursiv" title="Kursiv" disabled={!ready} onclick={toggleItalic}><em>I</em></button>
		<button type="button" class:active={active.bulletList} aria-pressed={active.bulletList} aria-label="Aufzählung" title="Aufzählung" disabled={!ready} onclick={toggleBulletList}>• Liste</button>
		<button type="button" class:active={active.orderedList} aria-pressed={active.orderedList} aria-label="Nummerierte Liste" title="Nummerierte Liste" disabled={!ready} onclick={toggleOrderedList}>1. Liste</button>
		<button type="button" class:active={active.blockquote} aria-pressed={active.blockquote} aria-label="Zitat" title="Zitat" disabled={!ready} onclick={toggleBlockquote}>❝</button>
		<button type="button" class:active={active.link} aria-pressed={active.link} aria-label="Link setzen oder entfernen" title="Link setzen oder entfernen" disabled={!ready} onclick={setLink}>🔗</button>
	</div>
	<div class="editor-content" bind:this={editorContainer}></div>
</div>

<style>
	.text-block-editor {
		border: 1px solid var(--fb-border);
		border-radius: 6px;
		overflow: hidden;
	}
	.toolbar {
		display: flex;
		gap: 2px;
		flex-wrap: wrap;
		padding: 6px;
		border-bottom: 1px solid var(--fb-border);
		background: var(--fb-hover);
	}
	.toolbar button {
		background: none;
		border: none;
		border-radius: 4px;
		min-width: 44px;
		min-height: 44px;
		padding: 7px 10px;
		font-size: 13px;
		color: var(--fb-gray);
		cursor: pointer;
	}
	.toolbar button:hover {
		background: var(--fb-border);
	}
	.toolbar button.active {
		background: var(--fb-blue);
		color: #fff;
	}
	.toolbar button:disabled {
		cursor: wait;
		opacity: 0.55;
	}
	.editor-content {
		padding: 10px 12px;
		font-size: 15px;
		line-height: 1.4;
		color: #050505;
		min-height: 60px;
	}
	.editor-content :global(.tiptap) {
		outline: none;
	}
	.editor-content :global(p) {
		margin: 0 0 0.5em 0;
	}
	.editor-content :global(p:last-child) {
		margin-bottom: 0;
	}
	.editor-content :global(ul),
	.editor-content :global(ol) {
		margin: 0 0 0.5em 1.2em;
		padding: 0;
	}
	.editor-content :global(blockquote) {
		margin: 0 0 0.5em 0;
		padding-left: 10px;
		border-left: 3px solid var(--fb-border);
		color: var(--fb-gray);
	}
</style>
