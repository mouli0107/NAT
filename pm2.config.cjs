module.exports = {
  apps: [{
    name: 'nat20',
    interpreter: 'node',
    script: 'node_modules/tsx/dist/cli.mjs',
    args: 'server/index.ts',
    cwd: 'C:\\Users\\chandramouli\\Downloads\\Nat20-main\\Nat20-main',
    env: {
      NODE_ENV: 'development',
    },
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 2000,
  }],
};
