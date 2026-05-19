let modalChart = null;
let historyChart = null;

function renderCandlestickChart(containerId, data) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight || 256,
        layout: {
            background: { color: '#0a0a0f' },
            textColor: '#9ca3af',
            fontSize: 11,
        },
        grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: '#374151',
        },
        rightPriceScale: {
            borderColor: '#374151',
        },
    });

    const series = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
    });

    series.setData(data);
    chart.timeScale().fitContent();

    new ResizeObserver(() => {
        chart.applyOptions({ width: container.clientWidth });
    }).observe(container);

    return chart;
}

function renderLineChart(containerId, data) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight || 128,
        layout: {
            background: { color: '#0a0a0f' },
            textColor: '#9ca3af',
            fontSize: 11,
        },
        grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
        },
        timeScale: {
            borderColor: '#374151',
        },
        rightPriceScale: {
            borderColor: '#374151',
        },
    });

    const series = chart.addAreaSeries({
        topColor: 'rgba(16, 185, 129, 0.3)',
        bottomColor: 'rgba(16, 185, 129, 0.02)',
        lineColor: '#10b981',
        lineWidth: 2,
    });

    series.setData(data);
    chart.timeScale().fitContent();

    new ResizeObserver(() => {
        chart.applyOptions({ width: container.clientWidth });
    }).observe(container);

    return chart;
}
