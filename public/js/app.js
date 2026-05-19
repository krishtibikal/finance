const API_BASE = '/api';
const REFRESH_INTERVAL = 60000;

async function fetchJSON(endpoint) {
    const res = await fetch(`${API_BASE}/${endpoint}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

function stockRow(stock, index, columns) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-800/50 cursor-pointer transition-colors';
    tr.onclick = () => openStockDetail(stock.symbol);

    let html = `<td class="text-gray-500">${index + 1}</td>`;
    html += `<td class="font-semibold text-white">${stock.symbol}</td>`;

    for (const col of columns) {
        switch (col) {
            case 'price':
                html += `<td class="text-right">${formatPrice(stock.price)}</td>`;
                break;
            case 'change':
                html += `<td class="text-right ${changeClass(stock.change)}">${sign(stock.change)}${stock.change?.toFixed(2) ?? '--'}</td>`;
                break;
            case 'pct_change':
                html += `<td class="text-right"><span class="px-1.5 py-0.5 rounded text-xs ${changeBgClass(stock.pct_change)}">${sign(stock.pct_change)}${stock.pct_change?.toFixed(2) ?? '--'}%</span></td>`;
                break;
            case 'volume':
                html += `<td class="text-right text-gray-300">${formatVolume(stock.volume)}</td>`;
                break;
            case 'day_high':
                html += `<td class="text-right text-gray-300">${formatPrice(stock.day_high)}</td>`;
                break;
            case 'day_low':
                html += `<td class="text-right text-gray-300">${formatPrice(stock.day_low)}</td>`;
                break;
            case 'pct_swing':
                html += `<td class="text-right"><span class="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">${stock.pct_swing?.toFixed(2) ?? '--'}%</span></td>`;
                break;
            case 'vol_ratio':
                html += `<td class="text-right text-gray-300">${stock.vol_ratio?.toFixed(1) ?? '--'}x</td>`;
                break;
            case 'above_sma5':
                html += `<td class="text-center">${stock.above_sma5 ? '<span class="text-emerald-400">Yes</span>' : '<span class="text-red-400">No</span>'}</td>`;
                break;
            case 'signal_strength':
                const maxSignal = 50;
                const pct = Math.min((stock.signal_strength / maxSignal) * 100, 100);
                html += `<td class="text-right">
                    <div class="flex items-center justify-end gap-2">
                        <div class="w-16 h-1.5 bg-gray-700 rounded overflow-hidden">
                            <div class="h-full bg-amber-400 rounded" style="width:${pct}%"></div>
                        </div>
                        <span class="text-amber-400 text-xs w-8 text-right">${stock.signal_strength?.toFixed(1)}</span>
                    </div>
                </td>`;
                break;
        }
    }

    tr.innerHTML = html;
    return tr;
}

function renderTable(bodyId, stocks, columns) {
    const tbody = document.getElementById(bodyId);
    tbody.innerHTML = '';
    if (!stocks || stocks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columns.length + 2}" class="text-center text-gray-500 py-8">No data available</td></tr>`;
        return;
    }
    stocks.forEach((s, i) => tbody.appendChild(stockRow(s, i, columns)));
}

async function loadMarketOverview() {
    try {
        const data = await fetchJSON('market_overview');
        document.getElementById('index-price').textContent = formatPrice(data.price);

        const changeEl = document.getElementById('index-change');
        changeEl.textContent = `${sign(data.change)}${data.change?.toFixed(2)}`;
        changeEl.className = `text-lg font-semibold ${changeClass(data.change)}`;

        const pctEl = document.getElementById('index-pct');
        pctEl.textContent = `${sign(data.pct_change)}${data.pct_change?.toFixed(2)}%`;
        pctEl.className = `text-sm px-2 py-0.5 rounded ${changeBgClass(data.pct_change)}`;

        document.getElementById('index-high').textContent = formatPrice(data.day_high);
        document.getElementById('index-low').textContent = formatPrice(data.day_low);
        document.getElementById('index-prev').textContent = formatPrice(data.prev_close);

        const statusEl = document.getElementById('market-status');
        const isOpen = data.market_status === 'Open';
        statusEl.innerHTML = `
            <span class="inline-block w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}"></span>
            <span class="text-sm ${isOpen ? 'text-emerald-400' : 'text-red-400'}">${data.market_status}</span>
        `;

        document.getElementById('last-updated').textContent = `Updated: ${data.last_updated}`;
    } catch (e) {
        console.error('Market overview error:', e);
    }
}

async function loadTopTraded() {
    try {
        const data = await fetchJSON('top_traded');
        renderTable('top-traded-body', data.stocks, ['price', 'change', 'pct_change', 'volume']);
    } catch (e) {
        console.error('Top traded error:', e);
    }
}

async function loadTopVolatile() {
    try {
        const data = await fetchJSON('top_volatile');
        renderTable('top-volatile-body', data.stocks, ['price', 'day_high', 'day_low', 'pct_swing']);
    } catch (e) {
        console.error('Top volatile error:', e);
    }
}

async function loadTopProfitable() {
    try {
        const data = await fetchJSON('top_profitable');
        renderTable('top-profitable-body', data.stocks, ['price', 'pct_change', 'volume', 'vol_ratio', 'above_sma5', 'signal_strength']);
    } catch (e) {
        console.error('Top profitable error:', e);
    }
}

async function loadGainersLosers() {
    try {
        const data = await fetchJSON('top_gainers_losers');
        renderTable('gainers-body', data.gainers, ['price', 'change', 'pct_change']);
        renderTable('losers-body', data.losers, ['price', 'change', 'pct_change']);
    } catch (e) {
        console.error('Gainers/losers error:', e);
    }
}

async function openStockDetail(symbol) {
    const modal = document.getElementById('stock-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    document.getElementById('modal-symbol').textContent = symbol;
    document.getElementById('modal-name').textContent = 'Loading...';
    document.getElementById('modal-price').textContent = '--';
    document.getElementById('modal-change').textContent = '';
    document.getElementById('modal-pct').textContent = '';
    document.getElementById('modal-stats').innerHTML = '';
    document.getElementById('modal-chart').innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Loading chart...</div>';
    document.getElementById('modal-history').innerHTML = '';

    try {
        const data = await fetchJSON(`stock_detail?symbol=${symbol}`);

        document.getElementById('modal-symbol').textContent = data.symbol;
        document.getElementById('modal-name').textContent = data.name;
        document.getElementById('modal-price').textContent = formatPrice(data.price);

        const changeEl = document.getElementById('modal-change');
        changeEl.textContent = `${sign(data.change)}${data.change?.toFixed(2)}`;
        changeEl.className = `text-lg font-semibold ${changeClass(data.change)}`;

        const pctEl = document.getElementById('modal-pct');
        pctEl.textContent = `${sign(data.pct_change)}${data.pct_change?.toFixed(2)}%`;
        pctEl.className = `text-sm px-2 py-0.5 rounded ${changeBgClass(data.pct_change)}`;

        const stats = [
            { label: 'Open', value: formatPrice(data.open) },
            { label: 'Day High', value: formatPrice(data.day_high) },
            { label: 'Day Low', value: formatPrice(data.day_low) },
            { label: 'Prev Close', value: formatPrice(data.prev_close) },
            { label: 'Volume', value: formatVolume(data.volume) },
            { label: 'Market Cap', value: formatMarketCap(data.market_cap) },
            { label: 'P/E Ratio', value: data.pe_ratio?.toFixed(2) ?? '--' },
            { label: '52W Range', value: `${formatPrice(data.week_52_low)} - ${formatPrice(data.week_52_high)}` },
        ];

        document.getElementById('modal-stats').innerHTML = stats.map(s =>
            `<div class="bg-gray-800/50 rounded px-3 py-2">
                <div class="text-xs text-gray-500">${s.label}</div>
                <div class="font-medium text-gray-200">${s.value}</div>
            </div>`
        ).join('');

        if (data.chart_1d && data.chart_1d.length > 0) {
            renderCandlestickChart('modal-chart', data.chart_1d);
        }

        if (data.history_5d && data.history_5d.length > 0) {
            renderLineChart('modal-history', data.history_5d);
        }
    } catch (e) {
        console.error('Stock detail error:', e);
        document.getElementById('modal-name').textContent = 'Error loading data';
    }
}

function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

let currentPortfolio = 1000;

function updatePortfolio() {
    const input = document.getElementById('portfolio-input');
    const val = parseFloat(input.value);
    if (val >= 100) {
        currentPortfolio = val;
        loadDailyPicks();
    }
}

function renderPickCard(pick) {
    const gainIfTarget = (pick.exit_conservative - pick.entry_price) * pick.shares_approx;
    const lossIfStop = (pick.entry_price - pick.stop_loss) * pick.shares_approx;

    return `
    <div class="pick-card" onclick="openStockDetail('${pick.symbol}')">
        <div class="flex items-start gap-3">
            <div class="pick-rank pick-rank-${pick.rank}">${pick.rank}</div>
            <div class="flex-1 min-w-0">
                <!-- Top row: symbol, price, change -->
                <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-bold text-white">${pick.symbol}</span>
                        <span class="px-1.5 py-0.5 rounded text-xs font-semibold ${pick.strategy === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}">${pick.strategy}</span>
                        <span class="text-gray-400 text-sm">${formatPrice(pick.price)}</span>
                        <span class="px-1.5 py-0.5 rounded text-xs ${changeBgClass(pick.today_change_pct)}">${sign(pick.today_change_pct)}${pick.today_change_pct.toFixed(2)}%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500">Score</span>
                        <span class="text-amber-400 font-bold text-sm">${pick.momentum_score.toFixed(1)}</span>
                    </div>
                </div>

                <!-- Entry / Exit / Stop Loss tags -->
                <div class="flex flex-wrap gap-2 mb-3">
                    <div class="pick-tag pick-entry">BUY @ ${formatPrice(pick.entry_price)}</div>
                    <div class="pick-tag pick-exit">TARGET @ ${formatPrice(pick.exit_conservative)}</div>
                    <div class="pick-tag pick-exit">AGGRESSIVE @ ${formatPrice(pick.exit_aggressive)}</div>
                    <div class="pick-tag pick-stop">STOP LOSS @ ${formatPrice(pick.stop_loss)}</div>
                </div>

                <!-- Timing -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs">
                    <div class="bg-gray-800/50 rounded px-2.5 py-1.5">
                        <span class="text-gray-500">Entry Window:</span>
                        <span class="text-emerald-300 ml-1">${pick.best_entry_time}</span>
                    </div>
                    <div class="bg-gray-800/50 rounded px-2.5 py-1.5">
                        <span class="text-gray-500">Exit Window:</span>
                        <span class="text-amber-300 ml-1">${pick.best_exit_time}</span>
                    </div>
                </div>

                <!-- Stats row -->
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs mb-3">
                    <div>
                        <div class="text-gray-600">Avg Range</div>
                        <div class="text-purple-400 font-medium">${pick.avg_daily_range_pct.toFixed(2)}%</div>
                    </div>
                    <div>
                        <div class="text-gray-600">Today Range</div>
                        <div class="text-purple-400 font-medium">${pick.day_range_pct.toFixed(2)}%</div>
                    </div>
                    <div>
                        <div class="text-gray-600">Vol Ratio</div>
                        <div class="text-gray-300 font-medium">${pick.vol_ratio.toFixed(1)}x</div>
                    </div>
                    <div>
                        <div class="text-gray-600">Trend</div>
                        <div class="${pick.trend_up ? 'text-emerald-400' : 'text-red-400'} font-medium">${pick.trend_up ? 'Bullish' : 'Bearish'}</div>
                    </div>
                    <div>
                        <div class="text-gray-600">Support</div>
                        <div class="text-gray-300 font-medium">${formatPrice(pick.support)}</div>
                    </div>
                    <div>
                        <div class="text-gray-600">Resistance</div>
                        <div class="text-gray-300 font-medium">${formatPrice(pick.resistance)}</div>
                    </div>
                </div>

                <!-- Allocation bar -->
                <div class="flex items-center gap-3">
                    <div class="flex-1">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-gray-500">Allocation: <span class="text-emerald-400 font-semibold">${pick.allocation_pct.toFixed(1)}%</span></span>
                            <span class="text-white font-semibold">${formatPrice(pick.allocation_usd)} (${pick.shares_approx} share${pick.shares_approx !== 1 ? 's' : ''})</span>
                        </div>
                        <div class="allocation-bar">
                            <div class="allocation-fill" style="width: ${pick.allocation_pct}%"></div>
                        </div>
                    </div>
                    <div class="text-right text-xs flex-shrink-0 w-24">
                        <div class="text-emerald-400">+${formatPrice(gainIfTarget)}</div>
                        <div class="text-red-400">-${formatPrice(lossIfStop)}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

async function loadDailyPicks() {
    try {
        const data = await fetchJSON(`daily_picks?portfolio=${currentPortfolio}`);
        const container = document.getElementById('picks-container');

        document.getElementById('picks-portfolio').textContent = formatPrice(currentPortfolio);
        document.getElementById('summary-capital').textContent = formatPrice(currentPortfolio);
        document.getElementById('summary-positions').textContent = data.picks.length;

        if (data.picks.length > 0) {
            const avgGain = data.picks.reduce((a, p) => a + p.potential_gain_pct, 0) / data.picks.length;
            document.getElementById('summary-avg-gain').textContent = `${avgGain.toFixed(2)}%`;
            document.getElementById('summary-risk').textContent = formatPrice(currentPortfolio * 0.03);
            document.getElementById('summary-target').textContent = formatPrice(currentPortfolio * 0.10);
            container.innerHTML = data.picks.map(renderPickCard).join('');
        } else {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">No strong picks found for today. Market may lack momentum.</div>';
        }
    } catch (e) {
        console.error('Daily picks error:', e);
        document.getElementById('picks-container').innerHTML = '<div class="text-center text-red-400 py-8">Error loading picks. Retrying...</div>';
    }
}

async function loadAll() {
    await Promise.allSettled([
        loadMarketOverview(),
        loadDailyPicks(),
        loadTopTraded(),
        loadTopVolatile(),
        loadTopProfitable(),
        loadGainersLosers(),
    ]);
}

loadAll();
setInterval(loadAll, REFRESH_INTERVAL);
