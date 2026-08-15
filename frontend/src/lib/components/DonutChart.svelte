<script lang="ts">
	export let data: { name: string; value: number; color: string }[] = [];

	$: total = Math.max(
		data.reduce((s, d) => s + d.value, 0),
		1
	);

	const radius = 70;
	const stroke = 22;
	const circumference = 2 * Math.PI * radius;

	$: segments = (() => {
		let offset = 0;
		return data.map((d) => {
			const fraction = d.value / total;
			const seg = { ...d, fraction, offset };
			offset += fraction;
			return seg;
		});
	})();
</script>

<div class="flex items-center justify-center gap-6">
	<svg width="180" height="180" viewBox="0 0 180 180" class="-rotate-90">
		<circle cx="90" cy="90" r={radius} fill="none" stroke="#1e293b" stroke-width={stroke} />
		{#each segments as seg}
			<circle
				cx="90"
				cy="90"
				r={radius}
				fill="none"
				stroke={seg.color}
				stroke-width={stroke}
				stroke-dasharray="{seg.fraction * circumference} {circumference}"
				stroke-dashoffset={-seg.offset * circumference}
				stroke-linecap="round"
				class="transition-all duration-500"
			/>
		{/each}
	</svg>
	<div class="flex flex-col gap-2">
		{#each data as d}
			<div class="flex items-center gap-2 text-sm">
				<span class="h-2.5 w-2.5 rounded-full" style="background:{d.color}" />
				<span class="text-slate-400">{d.name}</span>
				<span class="font-mono font-semibold text-white">{d.value}</span>
			</div>
		{/each}
	</div>
</div>
