// Launcher: starts IPC Agentic Framework frontend
import { spawn } from 'child_process';
const proc = spawn('npm', ['run', 'dev'], {
  cwd: 'C:/Users/chandramouli/ipc-agentic-framework/frontend',
  stdio: 'inherit',
  shell: true
});
proc.on('exit', code => process.exit(code ?? 0));
