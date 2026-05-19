from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from _tickers import NASDAQ_100

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            data = yf.download(NASDAQ_100, period="2d", interval="1d", group_by="ticker", threads=True, progress=False)
            results = []

            for symbol in NASDAQ_100:
                try:
                    hist = data[symbol].dropna()
                    if len(hist) < 2:
                        continue
                    latest = hist.iloc[-1]
                    prev = hist.iloc[-2]
                    price = float(latest["Close"])
                    prev_close = float(prev["Close"])
                    volume = int(latest["Volume"])
                    if price <= 0 or prev_close <= 0:
                        continue
                    change = price - prev_close
                    pct = (change / prev_close) * 100
                    results.append({
                        "symbol": symbol,
                        "price": round(price, 2),
                        "change": round(change, 2),
                        "pct_change": round(pct, 2),
                        "volume": volume,
                    })
                except Exception:
                    continue

            results.sort(key=lambda x: x["pct_change"], reverse=True)
            gainers = results[:5]
            losers = results[-5:][::-1]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "gainers": gainers,
                "losers": losers,
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
