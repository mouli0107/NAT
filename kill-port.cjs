/**
 * kill-port.cjs
 * Kills any process listening on port 5000 using netstat + PowerShell Stop-Process.
 * Works even when WMI/CIM is broken (no Get-NetTCPConnection, no wmic needed).
 */
const { execSync, spawnSync } = require('child_process');

const PORT = 5000;

try {
  const out = execSync('netstat -ano', { encoding: 'utf8' });
  const pids = new Set();

  for (const line of out.split('\n')) {
    // Match lines like:  TCP  0.0.0.0:5000  0.0.0.0:0  LISTENING  12345
    if (line.includes(`:${PORT}`) && line.toUpperCase().includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    }
  }

  if (pids.size === 0) {
    console.log(`[kill-port] Port ${PORT} is already free.`);
  } else {
    for (const pid of pids) {
      console.log(`[kill-port] Killing PID ${pid} on port ${PORT}...`);
      spawnSync(
        'powershell',
        ['-NoProfile', '-Command', `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`],
        { stdio: 'inherit' }
      );
    }
    // Give the OS ~1.2 s to release the socket
    execSync('powershell -NoProfile -Command "Start-Sleep -Milliseconds 1200"');
    console.log(`[kill-port] Port ${PORT} freed.`);
  }
} catch (e) {
  // Silently ignore — server retry logic handles any remaining EADDRINUSE
}
