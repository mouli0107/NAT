// Launcher: serves the pre-built pc-platform dist/ folder via a static SPA server.
// The project is built with Vite 7.3.1 (pnpm build), producing dist/ with correct Tailwind v4 CSS.
// This avoids running Vite 5.4.21 (the Preview tool's embedded version) which is incompatible
// with @tailwindcss/vite@4.2.1 (which requires Vite 6+ Environment API).
const { spawn } = require('child_process')
const path = require('path')

const serveScript = path.resolve(__dirname, '../../pc-platform/apps/pc-web/serve-dist.cjs')

const child = spawn(process.execPath, [serveScript], {
  cwd: path.resolve(__dirname, '../../pc-platform/apps/pc-web'),
  stdio: 'inherit',
  env: { ...process.env },
})

child.on('exit', code => process.exit(code ?? 0))
process.on('SIGTERM', () => child.kill())
process.on('SIGINT',  () => child.kill())
