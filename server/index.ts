import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { pool } from './db';
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import { detectBrowser, startPlaywrightInstallation, isPlaywrightReady, ensureXvfb } from "./playwright-setup";

const app = express();

// Trust Azure App Service reverse proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Augment express-session to carry our auth fields
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    tenantId?: string;
    username?: string;
  }
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'nat20-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Suppress noisy polling endpoints — agent-status is polled every 30s and
    // a 304 (Not Modified) just means the client cache is still fresh; not useful in logs.
    const isPollingNoise =
      path === '/api/recorder/agent-status' && res.statusCode === 304;
    if (path.startsWith("/api") && !isPollingNoise) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Auto-migrate database schema on every startup (creates tables if missing)
  // 20-second timeout prevents a flaky DB connection from hanging startup forever.
  try {
    await Promise.race([
      (async () => {
        const { migrate } = await import('drizzle-orm/node-postgres/migrator');
        const { db } = await import('./db');
        await migrate(db, { migrationsFolder: './migrations' });
        log('[DB] Migrations applied successfully');
      })(),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
    ]);
  } catch (err: any) {
    log(`[DB] Migration warning: ${err.message}`);
  }

  // Seed default tenant + admin user via raw SQL
  // Password hash = Temp@1234 (scrypt, verified locally)
  const ADMIN_PW_HASH = '9a1ad61d6bd1bb41b55ec5b738aed154:cf31ece263f0ffc54dcfddb05b4959cce71be689685d82405797602c23be59172476cd2aae27babe058e9ac8973bb4932d5d1206cbcfbba8350f4d0028b141db';
  try {
    await Promise.race([
      (async () => {
        await pool.query(`
          INSERT INTO tenants (id, name, slug)
          VALUES ('default-tenant', 'NAT 2.0 Default', 'default')
          ON CONFLICT (id) DO NOTHING
        `);
        await pool.query(`
          INSERT INTO users (id, tenant_id, username, password, must_change_password)
          VALUES ('admin-user-1', 'default-tenant', 'chandramouli@nousinfo.com', $1, true)
          ON CONFLICT (id) DO NOTHING
        `, [ADMIN_PW_HASH]);
        log('[DB] Admin user seed complete');
      })(),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('seed timeout')), 15000)),
    ]);
  } catch (err: any) {
    log(`[DB] Seed error: ${err.message}`);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ── ONE-TIME DATA MIGRATION ENDPOINT ────────────────────────────────────────
  // Registered here (after all API routes, before the SPA catch-all) to guarantee
  // the POST route is matched before app.use("*") in serveStatic swallows it.
  // Protected by a hardcoded secret. Remove after migration is complete.
  app.post('/api/admin/migrate-data', async (req: Request, res: Response) => {
    const SECRET = 'nat20-migrate-2026';
    if (req.body?.secret !== SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { table, rows } = req.body as { table: string; rows: Record<string, unknown>[] };
    if (!table || !Array.isArray(rows)) return res.status(400).json({ error: 'table and rows[] required' });
    if (rows.length === 0) return res.json({ inserted: 0, table });

    try {
      const client = await pool.connect();
      try {
        await client.query("SET session_replication_role = 'replica'");
        const cols = Object.keys(rows[0]);
        const BATCH = 200;
        let total = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH);
          const values: unknown[] = [];
          const ph = batch.map((row, bi) => {
            const base = bi * cols.length;
            cols.forEach(c => values.push(row[c] === undefined ? null : row[c]));
            return `(${cols.map((_, j) => `$${base + j + 1}`).join(', ')})`;
          });
          await client.query(
            `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES ${ph.join(', ')} ON CONFLICT DO NOTHING`,
            values
          );
          total += batch.length;
        }
        await client.query("SET session_replication_role = 'DEFAULT'");
        log(`[Migrate] ${table}: ${total} rows`);
        return res.json({ inserted: total, table });
      } finally { client.release(); }
    } catch (err: any) {
      log(`[Migrate] ERROR ${table}: ${err.message}`);
      return res.status(500).json({ error: err.message, table });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // Start virtual display on Linux containers before any browser is launched
  ensureXvfb();
  // Detect system browser before server starts (fast — no download)
  detectBrowser();

  // ── Graceful shutdown ────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    log(`[Shutdown] ${signal} received — closing server on port ${port}`);
    server.close(() => {
      log('[Shutdown] HTTP server closed. Port released. Exiting.');
      process.exit(0);
    });
    // Force-exit after 3 s if SSE/WS connections prevent clean close
    setTimeout(() => {
      log('[Shutdown] Force exit after timeout.');
      process.exit(0);
    }, 3000).unref();
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP',  () => shutdown('SIGHUP'));

  // ── Listen with auto-retry on EADDRINUSE ─────────────────────────────
  // On Windows, killing a process leaves the socket in TIME_WAIT for a
  // few seconds. We retry up to 5 times with a 1.5 s gap so `npm run dev`
  // always succeeds without needing a machine restart.
  const MAX_RETRIES = 8;
  const RETRY_DELAY = 2000;

  const startListening = (attempt: number) => {
    server.listen({ port, host: '0.0.0.0' }, () => {
      log(`serving on port ${port}`);
      if (!isPlaywrightReady()) startPlaywrightInstallation();
    });

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        if (attempt < MAX_RETRIES) {
          log(`[Server] Port ${port} still in use — retrying in ${RETRY_DELAY}ms (attempt ${attempt}/${MAX_RETRIES})…`);
          server.close();
          setTimeout(() => startListening(attempt + 1), RETRY_DELAY);
        } else {
          log(`[Server] Port ${port} still blocked after ${MAX_RETRIES} attempts. Run kill-server.bat then try again.`);
          process.exit(1);
        }
      } else {
        throw err;
      }
    });
  };

  startListening(1);
})();
