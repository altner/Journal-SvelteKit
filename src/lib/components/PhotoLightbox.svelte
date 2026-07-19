<script lang="ts">
	import { enhance } from '$app/forms';

	type Photo = { id: string; filename: string };

	// Prev/next/close are always real <a href> links (deep-linkable, work without JS).
	// When a callback is given, a plain click intercepts navigation and runs it instead
	// (shallow routing); modifier-clicks (new tab, etc.) always fall through to the href.
	let {
		photo,
		prevHref,
		nextHref,
		closeHref,
		onPrev,
		onNext,
		onClose,
		deleteAction,
		onDeleted
	}: {
		photo: Photo;
		prevHref?: string;
		nextHref?: string;
		closeHref: string;
		onPrev?: () => void;
		onNext?: () => void;
		onClose?: () => void;
		deleteAction?: string;
		onDeleted?: () => void | Promise<void>;
	} = $props();

	let deleteError = $state<string | undefined>();

	function onDeleteSubmit(e: SubmitEvent) {
		if (!confirm('Dieses Foto wirklich löschen?')) {
			e.preventDefault();
		}
	}

	function isPlainClick(e: MouseEvent) {
		return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
	}

	function intercept(handler?: () => void) {
		return (e: MouseEvent) => {
			if (!handler || !isPlainClick(e)) return;
			e.preventDefault();
			handler();
		};
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) intercept(onClose)(e);
	}
</script>

<div class="lightbox" role="presentation" onclick={onBackdropClick}>
	<a class="close" href={closeHref} onclick={intercept(onClose)} aria-label="Schließen">✕</a>

	{#if deleteAction}
		<form
			method="POST"
			action={deleteAction}
			class="delete-form"
			onsubmit={onDeleteSubmit}
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure') {
						deleteError = result.data?.error as string | undefined;
						await update();
						return;
					}
					deleteError = undefined;
					if (onDeleted) {
						await onDeleted();
					} else {
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="photoId" value={photo.id} />
			<button type="submit" class="delete" aria-label="Foto löschen">🗑</button>
		</form>
		{#if deleteError}<span class="delete-error">{deleteError}</span>{/if}
	{/if}

	{#if prevHref}
		<a class="nav prev" href={prevHref} onclick={intercept(onPrev)} aria-label="Vorheriges Foto"
			>‹</a
		>
	{/if}

	<img class="full" src="/uploads/{photo.filename}" alt="" />

	{#if nextHref}
		<a class="nav next" href={nextHref} onclick={intercept(onNext)} aria-label="Nächstes Foto"
			>›</a
		>
	{/if}
</div>

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.full {
		max-width: 92vw;
		max-height: 92vh;
		object-fit: contain;
		display: block;
	}
	.close,
	.nav {
		position: absolute;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.close:hover,
	.nav:hover {
		background: rgba(255, 255, 255, 0.3);
	}
	.close {
		top: 16px;
		right: 16px;
		width: 40px;
		height: 40px;
		font-size: 18px;
	}
	.delete-form {
		position: absolute;
		top: 16px;
		right: 64px;
	}
	.delete {
		position: static;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		font-size: 16px;
	}
	.delete:hover {
		background: rgba(255, 255, 255, 0.3);
	}
	.delete-error {
		position: absolute;
		top: 60px;
		right: 16px;
		background: rgba(0, 0, 0, 0.7);
		color: #ff8a80;
		font-size: 12px;
		padding: 4px 8px;
		border-radius: 4px;
	}
	.nav {
		top: 50%;
		transform: translateY(-50%);
		width: 48px;
		height: 48px;
		font-size: 28px;
	}
	.nav.prev {
		left: 16px;
	}
	.nav.next {
		right: 16px;
	}
	@media (min-width: 1024px) {
		.close {
			top: 32px;
			right: 32px;
			width: 48px;
			height: 48px;
			font-size: 20px;
		}
		.nav {
			width: 56px;
			height: 56px;
			font-size: 32px;
		}
		.nav.prev {
			left: 32px;
		}
		.nav.next {
			right: 32px;
		}
		.delete-form {
			top: 32px;
			right: 88px;
		}
		.delete {
			width: 48px;
			height: 48px;
			font-size: 18px;
		}
	}
</style>
