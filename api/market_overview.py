from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from datetime import datetime

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            ticker = yf.Ticker("^IXIC")
            info = ticker.fast_info
            hist = ticker.history(period="2d")

            current = info.last_price
            prev_close = info.previous_close
            change = current - prev_close
            pct_change = (change / prev_close) * 100 if prev_close else 0

            now = datetime.now()
            hour = now.hour
            minute = now.minute
            weekday = now.weekday()
            is_open = weekday < 5 and ((hour == 9 and minute >= 30) or (10 <= hour < 16))

            data = {
                "index": "NASDAQ Composite",
                "symbol": "^IXIC",
                "price": round(current, 2),
                "change": round(change, 2),
                "pct_change": round(pct_change, 2),
                "prev_close": round(prev_close, 2),
                "day_high": round(info.day_high, 2) if info.day_high else None,
                "day_low": round(info.day_low, 2) if info.day_low else None,
                "market_status": "Open" if is_open else "Closed",
                "last_updated": now.strftime("%Y-%m-%d %H:%M:%S EST"),
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
