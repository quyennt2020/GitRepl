import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
  log("Starting server...");
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error('Server error:', err);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;

  // Create a function to attempt server start
  const startServer = async () => {
    try {
      log(`Starting server on port ${PORT}...`);
      await new Promise<void>((resolve, reject) => {
        server.once('error', (err: Error & { code?: string }) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${PORT} is already in use. Please ensure no other instance is running.`);
          }
          console.error('Server startup error:', err);
          reject(err);
        });

        server.listen(PORT, () => {
          log(`Server listening on port ${PORT}`);
          resolve();
        });
      });
    } catch (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  };

  // Start server
  await startServer();

})().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});