<script>
	import favicon from '$lib/assets/favicon.svg';
	import '@knadh/oat/oat.min.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(async () => {
		await import('@knadh/oat/oat.min.js');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
