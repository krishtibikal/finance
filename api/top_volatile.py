from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from _tickers import NASDAQ_100

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            data = yf.download(NASDAQ_100, period="1d", interval="1d", group_by="ticker", threads=True, progress=False)
            results = []

            for symbol in NASDAQ_100:
                try:
                    hist = data[symbol].dropna()
                    if len(hist) < 1:
                        continue
                    latest = hist.iloc[-1]
                    price = float(latest["Close"])
                    high = float(latest["High"])
                    low = float(latest["Low"])
                    volume = int(latest["Volume"])
                    if low <= 0:
                        continue
                    swing = ((high - low) / low) * 100
                    results.append({
                        "symbol": symbol,
                        "price": round(price, 2),
                        "day_high": round(high, 2),
                        "day_low": round(low, 2),
                        "pct_swing": round(swing, 2),
                        "volume": volume,
                    })
                except Exception:
                    continue

            results.sort(key=lambda x: x["pct_swing"], reverse=True)
            top10 = results[:10]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"stocks": top10}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
