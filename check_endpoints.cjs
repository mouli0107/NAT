const http = require('http');
const PORT = 5001;

function get(path) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port: PORT, path }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d.slice(0, 300) }));
    }).on('error', e => resolve({ error: e.message }));
  });
}

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: PORT, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d.slice(0, 400) }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log(`Testing NAT 2.0 server on port ${PORT}...\n`);

  // 1. check-url
  const r1 = await get('/api/recorder/check-url?url=https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  console.log('GET /api/recorder/check-url:');
  console.log('  Status:', r1.status);
  console.log('  Body  :', r1.error || r1.body.slice(0, 150));

  // 2. Create session
  const r2 = await post('/api/recorder/sessions', {});
  console.log('\nPOST /api/recorder/sessions:');
  console.log('  Status:', r2.status);
  console.log('  Body  :', r2.error || r2.body);

  let sessionId = null;
  try { sessionId = JSON.parse(r2.body).sessionId; } catch {}

  if (sessionId) {
    // 3. playwright-start  
    const r3 = await post('/api/recorder/playwright-start', {
      sessionId,
      url: 'https://apolf-web-preprod.azurewebsites.net/RedikerAcademy'
    });
    console.log('\nPOST /api/recorder/playwright-start:');
    console.log('  Status:', r3.status);
    console.log('  Body  :', r3.error || r3.body);
  }

  console.log('\nDone.');
})();
