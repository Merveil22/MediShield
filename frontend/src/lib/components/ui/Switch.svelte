<script lang="ts">
	export let checked = false;
	export let label = '';
</script>

<label class="flex shrink-0 cursor-pointer items-center gap-3 select-none">
	{#if label}
		<span class="text-sm font-medium whitespace-nowrap text-slate-300">{label}</span>
	{/if}
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		on:click={() => (checked = !checked)}
		class="relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
		class:bg-rose-500={checked}
		class:bg-slate-700={!checked}
	>
		<span
			class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
			style="transform: translateX({checked ? '20px' : '0px'})"
		/>
	</button>
</label>
