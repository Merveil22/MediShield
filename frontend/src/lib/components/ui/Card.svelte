<script lang="ts">
	import { cn } from '$lib/utils';
	let className: string = '';
	export { className as class };
</script>

<div class={cn('glass rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5', className)}>
	<slot />
</div>
