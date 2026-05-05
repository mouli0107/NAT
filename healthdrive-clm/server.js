/**
 * HealthDrive — Contract Management System (CLM)
 * Simple static file server for Azure Container Apps deployment
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ HealthDrive CLM running at http://localhost:${PORT}\n`);
});
