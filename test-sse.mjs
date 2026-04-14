import http from 'http';

const data = JSON.stringify({
  userStoryId: 'story-123',
  title: 'Agent can bind a commercial auto policy',
  description: 'As an agent I want to bind a policy',
  acceptanceCriteria: '- User must be logged in\n- Click bind button\n- Policy number is displayed',
  domain: 'insurance'
});

const opts = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/tests/sprint-generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Sending request...');
const req = http.request(opts, res => {
  console.log('Status:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  let body = '';
  res.on('data', chunk => {
    body += chunk.toString();
    // Print each SSE event as it arrives
    const lines = body.split('\n\n');
    if (lines.length > 1) {
      for (let i = 0; i < lines.length - 1; i++) {
        console.log('SSE EVENT:', lines[i].substring(0, 300));
      }
      body = lines[lines.length - 1];
    }
    if (body.length > 2000) {
      console.log('... (truncating, body too long)');
      process.exit(0);
    }
  });
  res.on('end', () => {
    if (body) console.log('REMAINING:', body.substring(0, 300));
    console.log('Stream ended');
    process.exit(0);
  });
});
req.on('error', e => { console.error('Request error:', e.message); process.exit(1); });
req.write(data);
req.end();

// Timeout after 20s
setTimeout(() => { console.log('Timeout - exiting'); process.exit(0); }, 20000);
