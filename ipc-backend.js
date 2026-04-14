// Launcher: starts IPC Agentic Framework backend
import { spawn } from 'child_process';
const proc = spawn('node', ['start.js'], {
  cwd: 'C:/Users/chandramouli/ipc-agentic-framework/backend',
  stdio: 'inherit',
  shell: false
});
proc.on('exit', code => process.exit(code ?? 0));
