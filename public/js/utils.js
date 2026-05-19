function formatNumber(num) {
    if (num == null) return '--';
    return num.toLocaleString('en-US');
}

function formatPrice(num) {
    if (num == null) return '--';
    return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatVolume(num) {
    if (num == null) return '--';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function formatMarketCap(num) {
    if (num == null) return '--';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + formatNumber(num);
}

function changeClass(val) {
    if (val > 0) return 'text-emerald-400';
    if (val < 0) return 'text-red-400';
    return 'text-gray-400';
}

function changeBgClass(val) {
    if (val > 0) return 'bg-emerald-500/20 text-emerald-400';
    if (val < 0) return 'bg-red-500/20 text-red-400';
    return 'bg-gray-500/20 text-gray-400';
}

function sign(val) {
    return val > 0 ? '+' : '';
}
