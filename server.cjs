/* Simple static file server for Vite dist on Cloud Run */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BASE = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.map':  'application/json',
};

function send(res, status, data, headers={}) {
  res.writeHead(status, headers);
  if (data) res.end(data); else res.end();
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback a index.html para rutas SPA
      fs.readFile(path.join(BASE, 'index.html'), (e2, idx) => {
        if (e2) send(res, 500, '500'); else send(res, 200, idx, {'Content-Type':'text/html; charset=utf-8'});
      });
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      send(res, 200, data, {'Content-Type': type});
    }
  });
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURI((req.url || '/').split('?')[0]);
    let filePath = path.join(BASE, urlPath);

    // Si piden carpeta, intenta index.html
    if (urlPath.endsWith('/')) filePath = path.join(filePath, 'index.html');

    // Asegura que no escapen del BASE
    const rel = path.relative(BASE, filePath);
    if (rel.startsWith('..')) return send(res, 403, '403');

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) {
        serveFile(res, path.join(filePath, 'index.html'));
      } else if (!err) {
        serveFile(res, filePath);
      } else {
        // fallback SPA
        serveFile(res, path.join(BASE, 'index.html'));
      }
    });
  } catch (e) {
    send(res, 500, '500');
  }
});

server.listen(PORT, () => {
  console.log('UI server listening on', PORT);
});
