# NAT 2.0 — Workspace Agent

The Workspace Agent runs on a developer's local machine and keeps generated test scripts in sync between the NAT 2.0 cloud platform and the local filesystem — enabling Claude Code to iterate on scripts without any data leaving the customer's environment.

## Architecture

```
NAT 2.0 Cloud (Azure)                  Developer's Machine
─────────────────────                  ────────────────────
┌─────────────────┐                    ┌──────────────────────────┐
│  NAT 2.0 Server │ ──sync_project──▶  │  Workspace Agent daemon  │
│                 │ ◀──file_changed──  │  (this package)          │
│  Blob Storage   │                    │                          │
│  (per-tenant)   │                    │  ~/nat20-workspace/      │
└─────────────────┘                    │    {tenant}/{project}/   │
                                       │      tests/              │
                                       │      locators/           │
                                       │      pages/              │
                                       │      actions/            │
                                       └──────────────────────────┘
                                                  │
                                       ┌──────────▼──────────┐
                                       │   Claude Code CLI   │
                                       │   (fixes scripts)   │
                                       └─────────────────────┘
```

## Quick Start

### 1. Download & Install

Download `nat20-workspace-agent.zip` from NAT 2.0 Settings → Desktop Setup.

```bash
cd nat20-workspace-agent
npm install
```

### 2. Login

```bash
# Connect to your NAT 2.0 instance
npx tsx agent.ts login --server=https://your-nat20-instance.azurewebsites.net

# Or for local dev
npx tsx agent.ts login --server=http://localhost:5000
```

This opens a browser with a device authorization page. Enter the shown user code to approve.

Credentials are saved to `~/.nat20/credentials.json` (permissions: 600).

### 3. Start the Agent

```bash
npx tsx agent.ts
```

The agent connects to NAT 2.0 and waits. Every time you generate or regenerate scripts in NAT 2.0, the files are automatically synced to your machine.

### 4. Use Claude Code

Once synced, open the project folder in VS Code:

```
~/nat20-workspace/{tenant}/{project-name}/
```

Start Claude Code and iterate:

```bash
cd ~/nat20-workspace/default-tenant/MyProject
claude "Fix the flaky login test in tests/FormSettings/TC001_Login.spec.ts"
```

Any file you save is automatically uploaded back to NAT 2.0 Blob Storage.

## Commands

| Command | Description |
|---------|-------------|
| `tsx agent.ts` | Start the daemon |
| `tsx agent.ts login` | Re-authenticate |
| `tsx agent.ts login --server=<url>` | Login to a specific NAT 2.0 instance |
| `tsx agent.ts logout` | Clear saved credentials |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NAT20_SERVER_URL` | `http://localhost:5000` | NAT 2.0 server URL |

## Multi-Instance

You can run multiple workspace agents — one per NAT 2.0 instance. Store credentials separately by pointing each to a different server via `--server=`.

## Security

- Device tokens are long-lived, hashed with SHA-256, stored in the server database
- Credentials file is created with mode 0600 (owner read/write only)
- Each tenant gets a strictly isolated Blob Storage container
- No cross-tenant data is ever exposed — device tokens are scoped to a tenant

## Troubleshooting

**"Invalid or expired device token"** — Run `tsx agent.ts login` to re-authenticate.

**"Failed to reach NAT 2.0 server"** — Check the server URL and ensure the NAT 2.0 instance is running.

**Files not appearing** — Verify the agent is connected (look for "Connected ✓" in output) and that NAT 2.0 has at least one workspace agent registered (Settings → Desktop Setup).
