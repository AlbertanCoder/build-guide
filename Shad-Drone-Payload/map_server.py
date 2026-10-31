"""Dependency-free live hotspot log and offline coordinate web viewer."""
from __future__ import annotations

import argparse
import json
import math
import threading
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


class MapStore:
    def __init__(self, log_path, keep=200):
        self.log_path = Path(log_path)
        self.keep = keep
        self.records = deque(maxlen=keep)
        self.lock = threading.Lock()
        if self.log_path.exists():
            for line in self.log_path.read_text(encoding="utf-8").splitlines()[-keep:]:
                try:
                    self.records.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

    def append(self, record):
        lat = float(record["lat"])
        lon = float(record["lon"])
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("invalid hotspot coordinates")
        item = dict(record)
        item["lat"] = lat
        item["lon"] = lon
        item["received_utc"] = datetime.now(timezone.utc).isoformat()
        line = json.dumps(item, separators=(",", ":"), allow_nan=False)
        with self.lock:
            self.records.append(item)
            with self.log_path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")
        return item

    def latest(self):
        with self.lock:
            return list(self.records)


PAGE = """<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shad drone hotspot log</title>
<style>body{font:16px system-ui;margin:20px;background:#f7f2e8;color:#21332b}
canvas{display:block;max-width:100%;border:1px solid #aaa;background:#fff;border-radius:8px}
code{background:#efe9db;padding:2px 5px}#status{margin:10px 0;font-weight:600}</style>
<h1>Hotspot coordinate log</h1>
<p>Offline plot, not map tiles. Red = hotspot; blue = newest. Coordinates and source log remain authoritative.</p>
<div id="status">Waiting for records…</div><canvas id="plot" width="900" height="600"></canvas>
<pre id="records"></pre>
<script>
async function refresh(){
 const response=await fetch('/api/hotspots',{cache:'no-store'});const rows=await response.json();
 const canvas=document.getElementById('plot'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,900,600);
 ctx.strokeStyle='#e2d9c6';for(let x=0;x<=900;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke()}
 for(let y=0;y<=600;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke()}
 document.getElementById('records').textContent=JSON.stringify(rows.slice(-5).reverse(),null,2);
 if(!rows.length){document.getElementById('status').textContent='Waiting for records…';return}
 const lats=rows.map(r=>r.lat),lons=rows.map(r=>r.lon);
 const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons);
 const latPad=Math.max((maxLat-minLat)*.2,0.0001),lonPad=Math.max((maxLon-minLon)*.2,0.0001);
 const xy=r=>[50+(r.lon-minLon+lonPad)/(maxLon-minLon+2*lonPad)*800,
              550-(r.lat-minLat+latPad)/(maxLat-minLat+2*latPad)*500];
 rows.forEach((r,i)=>{const [x,y]=xy(r);ctx.beginPath();ctx.arc(x,y,i===rows.length-1?10:6,0,Math.PI*2);
 ctx.fillStyle=i===rows.length-1?'#2d6a8e':'#c2571b';ctx.fill()});
 const last=rows[rows.length-1];document.getElementById('status').textContent=
 `${rows.length} record(s); newest ${last.lat.toFixed(6)}, ${last.lon.toFixed(6)}, ${last.max_c}°C`;
}
refresh();setInterval(refresh,1000);
</script></html>"""


def serve(log_path, host="127.0.0.1", port=8000):
    store = MapStore(log_path)

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            path = urlparse(self.path).path
            if path == "/api/hotspots":
                body = json.dumps(store.latest()).encode("utf-8")
                content_type = "application/json; charset=utf-8"
            elif path == "/":
                body = PAGE.encode("utf-8")
                content_type = "text/html; charset=utf-8"
            elif path == "/health":
                body = b'{"ok":true}'
                content_type = "application/json"
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Map: http://{host}:{port}  log: {log_path}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--log", default="flight-log.jsonl")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    serve(args.log, args.host, args.port)
