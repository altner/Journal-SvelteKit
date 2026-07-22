<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, tick } from 'svelte';

	type Photo = { id: string; filename: string; originalName?: string | null; width?: number | null; height?: number | null };

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
		onDeleted,
		origins = []
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
		origins?: { label: string; title: string; href: string }[];
	} = $props();

	let deleteError = $state<string | undefined>();
	let deleting = $state(false);
	let dialog: HTMLDialogElement;
	let closeLink: HTMLAnchorElement;
	let image: HTMLImageElement;
	let animating = false;
	let dragStartX: number | null = null;
	let dragStartY: number | null = null;
	let dragLocked: 'x' | 'y' | null = null;
	let activePointerId: number | null = null;
	const SWIPE_THRESHOLD = 60;

	onMount(() => {
		const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		// Pointer activation does not focus links consistently in every browser. The shallow-routed
		// background still contains the photo link whose href is now the current pathname, so use it
		// as the reliable return target when the active element is only <body>.
		const opener = Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find(
			(link) => !dialog.contains(link) && link.getAttribute('href') === window.location.pathname
		);
		const returnFocus = activeElement && activeElement !== document.body ? activeElement : opener;
		// `open` keeps the progressive-enhancement fallback visible without JS. Upgrade it to a
		// modal dialog once hydrated, matching the Astro component.
		if (dialog.open) dialog.close();
		dialog.showModal();
		closeLink.focus();

		return () => {
			// Let the history-backed background finish becoming current before returning focus.
			setTimeout(() => {
				if (returnFocus?.isConnected) returnFocus.focus();
			}, 0);
		};
	});

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

	function close() {
		if (onClose) onClose();
		else window.location.href = closeHref;
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}

	function onCancel(e: Event) {
		e.preventDefault();
		close();
	}

	function wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function navigate(direction: 1 | -1, draggedX?: number) {
		const href = direction === 1 ? nextHref : prevHref;
		const handler = direction === 1 ? onNext : onPrev;
		if (!href || animating) return;
		animating = true;
		const distance = window.innerWidth;
		image.classList.add('animating');
		image.style.transform = `translateX(${direction === 1 ? -distance : distance}px)`;
		await wait(draggedX == null ? 220 : 200);

		if (!handler) {
			window.location.href = href;
			return;
		}
		handler();
		await tick();
		try {
			await image.decode();
		} catch {}

		image.classList.remove('animating');
		image.style.transform = `translateX(${direction * distance}px)`;
		await new Promise((resolve) => requestAnimationFrame(resolve));
		image.classList.add('animating');
		image.style.transform = 'translateX(0)';
		await wait(220);
		image.classList.remove('animating');
		image.style.transform = '';
		animating = false;
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (!dialog?.open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		} else if (e.key === 'ArrowLeft' && prevHref) {
			e.preventDefault();
			void navigate(-1);
		} else if (e.key === 'ArrowRight' && nextHref) {
			e.preventDefault();
			void navigate(1);
		}
	}

	function onPointerDown(e: PointerEvent) {
		if (animating || (e.pointerType === 'mouse' && e.button !== 0)) return;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragLocked = null;
		activePointerId = e.pointerId;
		image.classList.remove('animating');
	}

	function onPointerMove(e: PointerEvent) {
		if (dragStartX == null || e.pointerId !== activePointerId) return;
		const dx = e.clientX - dragStartX;
		const dy = e.clientY - (dragStartY ?? 0);
		if (dragLocked == null) {
			if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
			dragLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
			if (dragLocked === 'x') {
				try { image.setPointerCapture(e.pointerId); } catch {}
			}
		}
		if (dragLocked !== 'x') return;
		e.preventDefault();
		image.style.transform = `translateX(${dx}px)`;
	}

	function endDrag(e: PointerEvent) {
		if (dragStartX == null || e.pointerId !== activePointerId) return;
		const dx = e.clientX - dragStartX;
		const wasHorizontal = dragLocked === 'x';
		dragStartX = dragStartY = null;
		dragLocked = null;
		activePointerId = null;
		if (!wasHorizontal) {
			image.style.transform = '';
			return;
		}
		const direction: 1 | -1 = dx > 0 ? -1 : 1;
		const canNavigate = direction === 1 ? Boolean(nextHref) : Boolean(prevHref);
		if (Math.abs(dx) > SWIPE_THRESHOLD && canNavigate) {
			void navigate(direction, dx);
		} else {
			image.classList.add('animating');
			image.style.transform = 'translateX(0)';
			setTimeout(() => {
				image.classList.remove('animating');
				image.style.transform = '';
			}, 220);
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<dialog
	bind:this={dialog}
	open
	class="lightbox"
	aria-label={photo.originalName ? `Fotoansicht: ${photo.originalName}` : 'Fotoansicht'}
	onclick={onBackdropClick}
	oncancel={onCancel}
>
	<a bind:this={closeLink} class="close" href={closeHref} onclick={intercept(onClose)} aria-label="Schließen">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
	</a>

	{#if deleteAction}
		<form
			method="POST"
			action={deleteAction}
			class="delete-form"
			use:enhance={({ cancel }) => {
				if (!confirm('Dieses Foto wirklich löschen?')) {
					cancel();
					return;
				}
				deleting = true;
				return async ({ result, update }) => {
					if (result.type === 'failure') {
						deleteError = result.data?.error as string | undefined;
						deleting = false;
						await update();
						return;
					}
					if (result.type === 'error') {
						deleteError = 'Das Foto konnte nicht gelöscht werden. Bitte versuche es erneut.';
						deleting = false;
						return;
					}
					deleteError = undefined;
					if (onDeleted) {
						await onDeleted();
					} else {
						await update();
						deleting = false;
					}
				};
			}}
		>
			<input type="hidden" name="photoId" value={photo.id} />
			<button
				type="submit"
				class="delete"
				disabled={deleting}
				aria-label={deleting ? 'Foto wird gelöscht' : 'Foto löschen'}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M4 7 H20 M9 7 V4 H15 V7 M7 7 L8 20 H16 L17 7 M10 11 V16 M14 11 V16" />
				</svg>
			</button>
		</form>
		{#if deleteError}<span class="delete-error" role="alert">{deleteError}</span>{/if}
	{/if}

	{#if prevHref}
		<a class="nav prev" href={prevHref} onclick={(e) => { if (isPlainClick(e)) { e.preventDefault(); void navigate(-1); } }} aria-label="Vorheriges Foto">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" /></svg>
		</a>
	{/if}

	<div class="photo-content" class:with-origins={origins.length > 0}>
		<img bind:this={image} class="full" src="/uploads/{photo.filename}" alt={photo.originalName ?? 'Geöffnetes Foto'} width={photo.width ?? undefined} height={photo.height ?? undefined} fetchpriority="high" decoding="async" draggable="false" onpointerdown={onPointerDown} onpointermove={onPointerMove} onpointerup={endDrag} onpointercancel={endDrag} />
		{#if origins.length > 0}
			<div class="origins">
				{#each origins as origin, index (origin.href)}
					{#if index > 0}<span class="separator">·</span>{/if}
					<a href={origin.href}>
						<span>{origin.label}</span>
						<strong>{origin.title}</strong>
						<span aria-hidden="true">→</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	{#if nextHref}
		<a class="nav next" href={nextHref} onclick={(e) => { if (isPlainClick(e)) { e.preventDefault(); void navigate(1); } }} aria-label="Nächstes Foto">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" /></svg>
		</a>
	{/if}
</dialog>

<style>
	.lightbox {
		border: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		margin: 0;
		box-sizing: border-box;
		background: rgba(0, 0, 0, 0.92);
		color: #fff;
		overflow: hidden;
		/* Leaflet controls reach z-index 1000; the modal must cover the complete map. */
		z-index: 2000;
	}
	.lightbox::backdrop {
		background: rgba(0, 0, 0, 0.92);
	}
	.lightbox[open] {
		display: grid;
		grid-template-rows: 1fr;
		place-items: center;
	}
	.full {
		max-width: 100%;
		max-height: calc(100vh - 1.5rem);
		object-fit: contain;
		display: block;
		touch-action: pan-y;
		user-select: none;
		-webkit-user-drag: none;
	}
	.full:global(.animating) {
		transition: transform 220ms ease;
	}
	.photo-content {
		max-width: calc(100% - 1.5rem);
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}
	.photo-content.with-origins .full {
		max-height: calc(100vh - 4.5rem);
	}
	.origins {
		min-height: 46px;
		padding: 8px 12px;
		box-sizing: border-box;
		background: rgba(25, 25, 25, 0.96);
		color: #b0b3b8;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		flex-wrap: wrap;
		font-size: 12px;
	}
	.origins a {
		color: #fff;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.origins a:hover strong {
		text-decoration: underline;
	}
	.origins a > span:first-child {
		color: #b0b3b8;
		font-weight: 400;
	}
	.separator {
		color: #65676b;
	}
	.close,
	.nav {
		position: fixed;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.5);
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
		transition: background 0.15s ease;
		box-sizing: border-box;
		text-decoration: none;
	}
	.close:hover,
	.nav:hover {
		background: rgba(0, 0, 0, 0.8);
	}
	.close {
		top: 0.75rem;
		right: 0.75rem;
		width: 2.75rem;
		height: 2.75rem;
	}
	.close svg {
		width: 1.25rem;
		height: 1.25rem;
	}
	.close svg,
	.nav svg {
		display: block;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.delete-form {
		position: absolute;
		top: 12px;
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
		width: 44px;
		height: 44px;
	}
	.delete svg {
		display: block;
		width: 1.25rem;
		height: 1.25rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.delete:hover {
		background: rgba(255, 255, 255, 0.3);
	}
	.delete:disabled {
		cursor: wait;
		opacity: 0.6;
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
		width: 3rem;
		height: 3rem;
	}
	.nav svg {
		width: 1.5rem;
		height: 1.5rem;
	}
	.nav.prev {
		left: 1rem;
	}
	.nav.next {
		right: 1rem;
	}
	@media (min-width: 1024px) {
		.delete-form {
			top: 0.75rem;
			right: 4rem;
		}
	}
</style>
