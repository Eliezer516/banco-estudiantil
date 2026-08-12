<script>
	import favicon from '$lib/assets/favicon.svg';
	import '@knadh/oat/oat.min.css';
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(async () => {
		await import('@knadh/oat/oat.min.js');

		if (!dev && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(() => {});
		}
	});
</script>

<svelte:head>
	<title>Banco Estudiantil</title>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#1e3a8a" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Banco" />
	<link rel="apple-touch-icon" href="/icon-192.png" />
</svelte:head>

{@render children()}
