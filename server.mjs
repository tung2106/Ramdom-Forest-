import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const routes = new Map([
  ['/', ['public/index.html', 'text/html']],
  ['/app.js', ['public/app.js', 'text/javascript']],
  ['/analysis.js', ['public/analysis.js', 'text/javascript']],
  ['/style.css', ['public/style.css', 'text/css']],
  ['/data/hour.csv', ['archive/hour.csv', 'text/csv']],
]);
const server = http.createServer(async (req, res) => {
  const route = routes.get(new URL(req.url, 'http://localhost').pathname);
  if (req.method !== 'GET' || !route) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(path.join(root, route[0]));
    res.writeHead(200, { 'Content-Type': `${route[1]}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Khong doc duoc tep du lieu.'); }
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Mo app tai http://localhost:${server.address().port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
