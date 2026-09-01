#!/usr/bin/env node
/**
 * Launcher: serves the built dist of mfe-product-configurator.
 * Run `npm run build` in the app first if dist is stale.
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT ?? '5002', 10);
const DIST = path.resolve(
  __dirname,
  '../../InsurityEAIS_AIDLC/insurity-eais-frontend/apps/mfe-product-configurator/dist'
);

if (!fs.existsSync(DIST)) {
  console.error(`\n  ✗  dist not found at: ${DIST}`);
  console.error('  Run: npm run build  (inside apps/mfe-product-configurator)\n');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

const server = http.createServer((req, res) => {
  const urlPath  = req.url.split('?')[0];
  const filePath = path.join(DIST, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback
  const indexPath = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  fs.createReadStream(indexPath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n  ➜  MFE Product Configurator  http://localhost:${PORT}/\n`);
});
