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

// Function to attempt server startup with port fallback
const startServer = async (preferredPort: number) => {
  const ports = [preferredPort, 3000, 8080, 8000]; // Fallback ports

  console.log(`Starting server initialization at ${new Date().toISOString()}`);

  // Register routes and get HTTP server instance
  const server = registerRoutes(app);

  // Configure error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(`[ERROR] ${message}`, err);
  });

  // Set up Vite or static file serving based on environment
  if (app.get("env") === "development") {
    console.log("Setting up Vite development server");
    await setupVite(app, server);
  } else {
    console.log("Setting up static file serving for production");
    serveStatic(app);
  }

  // Attempt to start the server on different ports if needed
  for (const port of ports) {
    try {
      console.log(`Attempting to start server on port ${port}...`);

      await new Promise<void>((resolve, reject) => {
        // Set a connection timeout
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out while attempting to bind to port ${port}`));
        }, 5000);

        // Attempt to start the server
        server.listen(port, "0.0.0.0", () => {
          clearTimeout(timeout);
          log(`Server running on port ${port}`);
          resolve();
        });

        // Handle errors during startup
        server.once('error', (err: Error & { code?: string }) => {
          clearTimeout(timeout);

          if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use, trying next port...`);
            server.close();
            // Don't reject, allow the loop to continue
            resolve();
          } else {
            console.error(`Error starting server on port ${port}:`, err);
            reject(err);
          }
        });
      }).then(() => {
        // If the server is listening (no error thrown), break the loop
        if (server.listening) {
          console.log(`Successfully started server on port ${port}`);
          return true;
        }
        return false;
      }).catch((err) => {
        console.error(`Failed to start server on port ${port}:`, err);
        return false;
      });

      // If server is listening, break out of the loop
      if (server.listening) {
        break;
      }
    } catch (error) {
      console.error(`Error during server startup on port ${port}:`, error);
      // Continue to next port
    }
  }

  // If server didn't start on any port
  if (!server.listening) {
    console.error("Failed to start server on any available port. Exiting process.");
    process.exit(1);
  }
};

// Start the server with port 5000 as the preferred port
startServer(5000).catch(err => {
  console.error("Fatal error during server startup:", err);
  process.exit(1);
});