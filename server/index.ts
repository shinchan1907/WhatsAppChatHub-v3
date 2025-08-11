import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Initialize routes and get HTTP server
let httpServer: any = null;

(async () => {
  try {
    httpServer = await registerRoutes(app);
  } catch (error) {
    log(`Error registering routes: ${error}`);
  }
})();

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  log(`Error: ${status} - ${message}`);
  res.status(status).json({ message });
});

// Setup static file serving for production
if (app.get("env") === "development") {
  // Development: Setup Vite dev server
  (async () => {
    try {
      if (httpServer) {
        await setupVite(app, httpServer);
        
        const isWindows = process.platform === "win32";
        const port = parseInt(process.env.PORT || "5000", 10);

        httpServer.listen({
          port,
          host: isWindows ? "127.0.0.1" : "0.0.0.0",
        }, () => {
          log(`Development server running on http://${isWindows ? "127.0.0.1" : "0.0.0.0"}:${port}`);
        });
      }
    } catch (error) {
      log(`Error setting up development server: ${error}`);
    }
  })();
} else {
  // Production: Serve static files
  serveStatic(app);
}

// Export the Express app for Vercel
export default app;
