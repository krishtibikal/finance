from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from _tickers import NASDAQ_100

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            data = yf.download(NASDAQ_100, period="5d", interval="1d", group_by="ticker", threads=True, progress=False)
            results = []

            for symbol in NASDAQ_100:
                try:
                    hist = data[symbol].dropna()
                    if len(hist) < 3:
                        continue

                    latest = hist.iloc[-1]
                    prev = hist.iloc[-2]
                    price = float(latest["Close"])
                    prev_close = float(prev["Close"])
                    volume = int(latest["Volume"])
                    if price <= 0 or prev_close <= 0 or volume <= 0:
                        continue

                    pct = ((price - prev_close) / prev_close) * 100
                    if pct <= 0:
                        continue

                    sma5 = float(hist["Close"].mean())
                    above_sma = bool(price > sma5)
                    avg_vol = hist["Volume"].mean()
                    vol_ratio = volume / avg_vol if avg_vol > 0 else 1

                    signal = round(pct * vol_ratio * (1.5 if above_sma else 0.5), 2)

                    results.append({
                        "symbol": symbol,
                        "price": round(price, 2),
                        "pct_change": round(pct, 2),
                        "volume": volume,
                        "vol_ratio": round(vol_ratio, 2),
                        "above_sma5": above_sma,
                        "signal_strength": signal,
                    })
                except Exception:
                    continue

            results.sort(key=lambda x: x["signal_strength"], reverse=True)
            top10 = results[:10]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "stocks": top10,
                "disclaimer": "For informational purposes only. Not financial advice."
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
