const https = require('https');

const BASE = 'https://apolf-web-preprod.azurewebsites.net';

// Common ASP.NET / MVC login paths to probe
const paths = [
  '/RedikerAcademy/Account/Login',
  '/RedikerAcademy/Login',
  '/RedikerAcademy/login',
  '/RedikerAcademy/Account/SignIn',
  '/RedikerAcademy/Auth/Login',
  '/RedikerAcademy/Home/Login',
  '/RedikerAcademy/Account/LogOn',
];

function probe(path) {
  return new Promise((resolve) => {
    const req = https.get({
      hostname: 'apolf-web-preprod.azurewebsites.net',
      path,
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
      timeout: 8000
    }, (res) => {
      let body = '';
      res.on('data', c => { if (body.length < 3000) body += c.toString(); });
      res.on('end', () => {
        const title = (body.match(/<title>([^<]+)<\/title>/i) || [])[1] || '';
        const hasPassword = /password|Password/i.test(body);
        const hasForm = /<form/i.test(body);
        console.log(`${res.statusCode} ${path}`);
        if (res.statusCode === 200) {
          console.log(`   ✅ Reachable! Title: "${title.trim()}" | hasPassword: ${hasPassword} | hasForm: ${hasForm}`);
          if (hasPassword && hasForm) {
            const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            console.log(`   Preview: ${text.substring(0, 300)}`);
          }
        } else if (res.statusCode >= 300 && res.statusCode < 400) {
          console.log(`   → Redirects to: ${res.headers.location}`);
        }
        resolve({ path, status: res.statusCode, hasPassword, hasForm, title });
      });
    });
    req.on('error', e => { console.log(`ERR ${path}: ${e.message}`); resolve(null); });
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

(async () => {
  console.log('Probing login paths on apolf-web-preprod.azurewebsites.net...\n');
  for (const p of paths) await probe(p);
  console.log('\nDone.');
})();
