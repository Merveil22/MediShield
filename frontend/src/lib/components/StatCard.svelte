<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType;
	export let label: string;
	export let value: string | number;
	export let color: string = '#38bdf8';
</script>

<Card class="flex-1">
	<div class="flex items-center gap-4">
		<div
			class="flex h-13 w-13 items-center justify-center rounded-2xl border"
			style="background:{color}22; border-color:{color}55; width:52px; height:52px;"
		>
			<svelte:component this={icon} size={26} color={color} />
		</div>
		<div class="flex flex-col gap-0.5">
			<span class="text-[11px] font-semibold uppercase tracking-widest text-slate-500"
				>{label}</span
			>
			<span class="font-mono text-3xl font-extrabold text-white">{value}</span>
		</div>
	</div>
</Card>
