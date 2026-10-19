import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json'
};
http
  .createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + (p === '/' ? '/index.html' : p));
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      // Validators let the browser reuse what it already has: the lake worker imports lake-data.js (465 KB) again
      // in its own module graph, and without them that was a second full download. no-cache keeps edits visible.
      const info = await stat(file);
      const etag = `"${info.size.toString(36)}-${Math.floor(info.mtimeMs).toString(36)}"`;
      const headers = {
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        ETag: etag,
        'Last-Modified': info.mtime.toUTCString()
      };
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        res.end();
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, headers);
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  })
  .listen(Number(process.env.PORT) || 8080, '0.0.0.0', () =>
    console.log(`Game: http://localhost:${Number(process.env.PORT) || 8080}  |  Stop: Ctrl+C`)
  );
