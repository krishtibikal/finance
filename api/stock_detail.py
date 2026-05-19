from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            query = parse_qs(urlparse(self.path).query)
            symbol = query.get("symbol", ["AAPL"])[0].upper()

            t = yf.Ticker(symbol)
            info = t.fast_info
            full_info = t.info

            price = info.last_price
            prev = info.previous_close
            change = price - prev if price and prev else 0
            pct = (change / prev) * 100 if prev else 0

            hist_1d = t.history(period="1d", interval="5m")
            chart_data = []
            for idx, row in hist_1d.iterrows():
                chart_data.append({
                    "time": int(idx.timestamp()),
                    "open": round(row["Open"], 2),
                    "high": round(row["High"], 2),
                    "low": round(row["Low"], 2),
                    "close": round(row["Close"], 2),
                })

            hist_5d = t.history(period="5d", interval="1d")
            history_5d = []
            for idx, row in hist_5d.iterrows():
                history_5d.append({
                    "time": idx.strftime("%Y-%m-%d"),
                    "close": round(row["Close"], 2),
                    "volume": int(row["Volume"]),
                })

            data = {
                "symbol": symbol,
                "name": full_info.get("shortName", symbol),
                "price": round(price, 2) if price else None,
                "change": round(change, 2),
                "pct_change": round(pct, 2),
                "open": round(info.open, 2) if info.open else None,
                "day_high": round(info.day_high, 2) if info.day_high else None,
                "day_low": round(info.day_low, 2) if info.day_low else None,
                "prev_close": round(prev, 2) if prev else None,
                "volume": int(info.last_volume) if info.last_volume else None,
                "market_cap": full_info.get("marketCap"),
                "pe_ratio": full_info.get("trailingPE"),
                "week_52_high": full_info.get("fiftyTwoWeekHigh"),
                "week_52_low": full_info.get("fiftyTwoWeekLow"),
                "chart_1d": chart_data,
                "history_5d": history_5d,
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
