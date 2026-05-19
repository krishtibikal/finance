import http.server
import socketserver
import json
import sys
import os
import importlib.util
from urllib.parse import urlparse, parse_qs
from io import BytesIO
import threading

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

PORT = 3456

class DevHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(os.path.dirname(__file__), 'public'), **kwargs)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._handle_api()
        else:
            super().do_GET()

    def _handle_api(self):
        parsed = urlparse(self.path)
        route = parsed.path.replace('/api/', '').split('?')[0]
        module_path = os.path.join(os.path.dirname(__file__), 'api', f'{route}.py')

        if not os.path.exists(module_path):
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
            return

        spec = importlib.util.spec_from_file_location(route, module_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        class FakeRequest:
            def __init__(self, path, wfile, send_response, send_header, end_headers):
                self.path = path
                self.wfile = wfile
                self.send_response = send_response
                self.send_header = send_header
                self.end_headers = end_headers

        fake = FakeRequest(self.path, self.wfile, self.send_response, self.send_header, self.end_headers)
        handler_instance = mod.handler.__new__(mod.handler)
        handler_instance.path = self.path
        handler_instance.wfile = self.wfile
        handler_instance.send_response = self.send_response
        handler_instance.send_header = self.send_header
        handler_instance.end_headers = self.end_headers
        handler_instance.do_GET()

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

if __name__ == '__main__':
    print(f'Starting dev server at http://localhost:{PORT}')
    server = ThreadedHTTPServer(('', PORT), DevHandler)
    server.serve_forever()
