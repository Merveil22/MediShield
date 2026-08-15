<script lang="ts">
	import { onMount } from 'svelte';
	import type { ISeriesApi, IChartApi } from 'lightweight-charts';

	let container: HTMLDivElement;
	let chart: IChartApi;
	let candleSeries: ISeriesApi<'Candlestick'>;
	let volumeSeries: ISeriesApi<'Histogram'>;

	onMount(async () => {
		const { createChart } = await import('lightweight-charts');

		chart = createChart(container, {
			layout: { background: { color: 'transparent' }, textColor: '#64748b' },
			grid: {
				vertLines: { color: 'rgba(56,189,248,0.06)' },
				horzLines: { color: 'rgba(56,189,248,0.06)' }
			},
			rightPriceScale: { borderColor: 'rgba(148,163,184,0.15)' },
			timeScale: {
				borderColor: 'rgba(148,163,184,0.15)',
				timeVisible: true,
				secondsVisible: true
			},
			width: container.clientWidth,
			height: 280
		});

		candleSeries = chart.addCandlestickSeries({
			upColor: '#34d399',
			downColor: '#f43f5e',
			borderVisible: false,
			wickUpColor: '#34d399',
			wickDownColor: '#f43f5e'
		});

		volumeSeries = chart.addHistogramSeries({
			priceFormat: { type: 'volume' },
			priceScaleId: '',
			scaleMargins: { top: 0.82, bottom: 0 },
			color: '#38bdf855'
		});

		const resizeObserver = new ResizeObserver((entries) => {
			chart.applyOptions({ width: entries[0].contentRect.width });
		});
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			chart.remove();
		};
	});

	// Ajoute un point (bougie) au graphe — appelée depuis la page
	// à chaque nouvelle alerte simulée ou réelle.
	export function pushPoint(
		time: number,
		open: number,
		high: number,
		low: number,
		close: number,
		volume: number
	) {
		if (!candleSeries) return;
		candleSeries.update({ time: time as never, open, high, low, close });
		volumeSeries.update({
			time: time as never,
			value: volume,
			color: close >= open ? '#34d39955' : '#f43f5e55'
		});
	}
</script>

<div bind:this={container} class="w-full" style="height:280px" />
