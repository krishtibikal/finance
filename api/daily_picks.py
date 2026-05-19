from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from urllib.parse import urlparse, parse_qs
from _tickers import NASDAQ_100

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            query = parse_qs(urlparse(self.path).query)
            portfolio = float(query.get("portfolio", ["1000"])[0])

            data_5d = yf.download(NASDAQ_100, period="5d", interval="1d", group_by="ticker", threads=True, progress=False)
            data_1d = yf.download(NASDAQ_100, period="1d", interval="1d", group_by="ticker", threads=True, progress=False)

            candidates = []
            for symbol in NASDAQ_100:
                try:
                    hist = data_5d[symbol].dropna()
                    if len(hist) < 3:
                        continue

                    latest = hist.iloc[-1]
                    prev_row = hist.iloc[-2]
                    price = float(latest["Close"])
                    prev_close = float(prev_row["Close"])
                    high = float(latest["High"])
                    low = float(latest["Low"])
                    volume = int(latest["Volume"])
                    if price <= 0 or prev_close <= 0 or low <= 0 or volume <= 0:
                        continue

                    today_change_pct = ((price - prev_close) / prev_close) * 100
                    day_range_pct = ((high - low) / low) * 100

                    avg_vol = hist["Volume"].mean()
                    vol_ratio = volume / avg_vol if avg_vol > 0 else 1

                    daily_ranges = []
                    for i in range(len(hist)):
                        row = hist.iloc[i]
                        if row["Low"] > 0:
                            daily_ranges.append((row["High"] - row["Low"]) / row["Low"] * 100)
                    avg_range = sum(daily_ranges) / len(daily_ranges) if daily_ranges else 0

                    sma5 = float(hist["Close"].mean())
                    trend_up = bool(price > sma5)

                    abs_change = abs(today_change_pct)
                    momentum_score = 0
                    momentum_score += min(abs_change * 2, 20)
                    if vol_ratio > 1.0:
                        momentum_score += min(vol_ratio * 5, 15)
                    if avg_range > 2:
                        momentum_score += min(avg_range * 3, 25)
                    if day_range_pct > 2:
                        momentum_score += min(day_range_pct * 2, 15)
                    if trend_up:
                        momentum_score += 5

                    strategy = "LONG" if today_change_pct >= -1 else "BOUNCE"

                    support = low
                    resistance = high
                    if strategy == "LONG":
                        entry = round(price * 0.998, 2)
                        exit_conservative = round(price * (1 + avg_range / 100 * 0.7), 2)
                        exit_aggressive = round(price * 1.10, 2)
                        stop_loss = round(price * 0.97, 2)
                        best_entry_time = "09:30-10:00 ET (opening volatility dip)" if avg_range >= 2.5 else "10:00-10:30 ET (after initial settling)"
                        best_exit_time = "11:00-13:00 ET (mid-day peak)" if avg_range >= 4 else "14:30-15:45 ET (afternoon push)"
                    else:
                        entry = round(low * 1.002, 2)
                        exit_conservative = round(low * (1 + avg_range / 100 * 0.5), 2)
                        exit_aggressive = round(low * (1 + avg_range / 100), 2)
                        stop_loss = round(low * 0.985, 2)
                        best_entry_time = "09:45-10:15 ET (buy the dip after sell-off)"
                        best_exit_time = "13:00-15:00 ET (recovery rally)"

                    potential_gain_pct = round(((exit_conservative - entry) / entry) * 100, 2)

                    candidates.append({
                        "symbol": symbol,
                        "strategy": strategy,
                        "price": round(price, 2),
                        "today_change_pct": round(today_change_pct, 2),
                        "avg_daily_range_pct": round(avg_range, 2),
                        "day_range_pct": round(day_range_pct, 2),
                        "vol_ratio": round(vol_ratio, 2),
                        "trend_up": trend_up,
                        "momentum_score": round(momentum_score, 1),
                        "entry_price": entry,
                        "exit_conservative": exit_conservative,
                        "exit_aggressive": exit_aggressive,
                        "stop_loss": stop_loss,
                        "potential_gain_pct": potential_gain_pct,
                        "support": round(support, 2),
                        "resistance": round(resistance, 2),
                        "best_entry_time": best_entry_time,
                        "best_exit_time": best_exit_time,
                    })
                except Exception:
                    continue

            candidates.sort(key=lambda x: x["momentum_score"], reverse=True)
            top5 = candidates[:5]

            total_score = sum(c["momentum_score"] for c in top5) or 1
            for i, pick in enumerate(top5):
                raw_pct = (pick["momentum_score"] / total_score) * 100
                pick["allocation_pct"] = round(raw_pct, 1)
                pick["allocation_usd"] = round(portfolio * raw_pct / 100, 2)
                pick["shares_approx"] = max(1, int(pick["allocation_usd"] / pick["price"])) if pick["price"] > 0 else 0
                pick["rank"] = i + 1

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "picks": top5,
                "portfolio": portfolio,
                "target_daily_return_pct": 10,
                "disclaimer": "HIGH RISK: Targeting 10% daily returns is extremely aggressive. Most professional traders target 1-2% daily. You can lose your entire investment. This is not financial advice. Past performance does not predict future results. Only invest what you can afford to lose.",
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
