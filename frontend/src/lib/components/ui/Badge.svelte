<script lang="ts">
	import { cn } from '$lib/utils';

	export let color: 'cyan' | 'orange' | 'rose' | 'green' | 'yellow' | 'slate' = 'cyan';
	let className: string = '';
	export { className as class };

	const palette: Record<string, string> = {
		cyan: 'bg-sky-400/15 text-sky-400 border-sky-400/40',
		orange: 'bg-orange-400/15 text-orange-400 border-orange-400/40',
		rose: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
		green: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/40',
		yellow: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/40',
		slate: 'bg-slate-500/15 text-slate-400 border-slate-500/40'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide',
		palette[color],
		className
	)}
>
	<slot />
</span>
