<script lang="ts">
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
		onClose
	}: {
		photo: Photo;
		prevHref?: string;
		nextHref?: string;
		closeHref: string;
		onPrev?: () => void;
		onNext?: () => void;
		onClose?: () => void;
	} = $props();

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
</style>
