"""Local server for tools/sound-lab.html.

Serves the project folder on http://127.0.0.1:8766 and accepts POST /api/config, which writes the
sound config to build-templates/web-mobile/sfx/config.json (the source the build copies) and, if a
build exists, also to build/web-mobile/sfx/config.json so the current build picks it up right away.

Run:  python tools/sound_lab.py        (or double-click tools/sound-lab.bat)
"""
import http.server
import json
import os
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8766
TARGETS = [
    os.path.join(ROOT, 'build-templates', 'web-mobile', 'sfx', 'config.json'),
    os.path.join(ROOT, 'build', 'web-mobile', 'sfx', 'config.json'),
]


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # always serve fresh files so edits and regenerated sounds show up on reload
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path != '/api/config':
            self.send_error(404)
            return
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > 2_000_000:
            self.send_error(400, 'bad size')
            return
        try:
            data = json.loads(self.rfile.read(length).decode('utf-8'))
            if not isinstance(data, dict) or 'sounds' not in data:
                raise ValueError('missing "sounds"')
        except Exception as e:  # noqa: BLE001
            self.send_error(400, 'invalid config: %s' % e)
            return
        text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
        written = []
        for i, path in enumerate(TARGETS):
            if i > 0 and not os.path.isdir(os.path.dirname(path)):
                continue
            with open(path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(text)
            written.append(os.path.relpath(path, ROOT).replace('\\', '/'))
        body = json.dumps({'ok': True, 'written': written}).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        if 'POST' in (fmt % args):
            sys.stderr.write('[sound-lab] ' + (fmt % args) + '\n')


def main():
    url = 'http://127.0.0.1:%d/tools/sound-lab.html' % PORT
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print('Sound lab: ' + url)
    print('Saving writes: ' + ', '.join(os.path.relpath(p, ROOT) for p in TARGETS))
    print('Press Ctrl+C to stop.')
    if '--no-browser' not in sys.argv:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
