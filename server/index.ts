import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import { detectBrowser, startPlaywrightInstallation, isPlaywrightReady } from "./playwright-setup";

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
    if (path.startsWith("/api")) {
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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
