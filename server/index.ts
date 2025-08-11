import { config } from "dotenv";

// Load environment variables FIRST, before any other imports
config();

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { initializeDatabase } from "./db";

const app = express();

// ============================================================================
// BASIC MIDDLEWARE
// ============================================================================

app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? [process.env.FRONTEND_URL || "https://yourdomain.com"]
    : ["http://localhost:3000", "http://localhost:3001", "http://localhost:5000", "http://localhost:5001"],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============================================================================
// HEALTH CHECK & STATUS ENDPOINTS
// ============================================================================

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
  });
});

app.get("/status", (req: Request, res: Response) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Import and use authentication routes
import authRoutes from "./routes/auth.js";
import settingsRoutes from "./routes/settings.js";
import templatesRoutes from "./routes/templates.js";
import automationRoutes from "./routes/automation.js";
import contactsRoutes from "./routes/contacts.js";
import conversationsRoutes from "./routes/conversations.js";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/templates", templatesRoutes);
app.use("/api/v1/automation", automationRoutes);
app.use("/api/v1/contacts", contactsRoutes);
app.use("/api/v1/conversations", conversationsRoutes);

// API Documentation
app.get("/api/v1/docs", (req: Request, res: Response) => {
  res.json({
    message: "WhatsApp Business Hub API Documentation",
    version: "v1",
    endpoints: {
      health: "/health",
      status: "/status",
      docs: "/api/v1/docs",
    },
    documentation: "https://docs.whatsappbusinesshub.com",
    support: "https://support.whatsappbusinesshub.com",
  });
});

// Feature Flags
app.get("/api/v1/features", (req: Request, res: Response) => {
  res.json({
    features: {
      // Core Features
      contacts: { enabled: true, plan: "all" },
      conversations: { enabled: true, plan: "all" },
      messages: { enabled: true, plan: "all" },
      templates: { enabled: true, plan: "all" },
      broadcasts: { enabled: true, plan: "all" },
      
      // Advanced Features
      automation: { enabled: true, plan: "professional" },
      segments: { enabled: true, plan: "professional" },
      campaigns: { enabled: true, plan: "professional" },
      analytics: { enabled: true, plan: "professional" },
      
      // Enterprise Features
      ai: { enabled: true, plan: "enterprise" },
      integrations: { enabled: true, plan: "enterprise" },
      webhooks: { enabled: true, plan: "enterprise" },
      api: { enabled: true, plan: "enterprise" },
    },
    timestamp: new Date().toISOString(),
  });
});

// Rate Limiting Info
app.get("/api/v1/rate-limits", (req: Request, res: Response) => {
  res.json({
    rateLimits: {
      general: {
        windowMs: "15 minutes",
        max: 100,
        description: "General API requests per IP",
      },
      auth: {
        windowMs: "15 minutes",
        max: 5,
        description: "Authentication attempts per IP",
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    error: "Server Error",
    message,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// DEVELOPMENT SERVER (ONLY FOR LOCAL DEVELOPMENT)
// ============================================================================

if (process.env.NODE_ENV === "development") {
  const PORT = process.env.PORT || 5000;
  
         // Initialize database
       initializeDatabase().then(() => {
         app.listen(PORT, () => {
           console.log(`🚀 Development server running on http://localhost:${PORT}`);
           console.log(`📊 Health check: http://localhost:${PORT}/health`);
           console.log(`📈 Status: http://localhost:${PORT}/status`);
         });
       }).catch((error) => {
         console.error("❌ Failed to initialize database:", error);
         process.exit(1);
       });
}

// ============================================================================
// VERCEL EXPORT
// ============================================================================

// Export for Vercel serverless functions
export default app;

// Export for direct server usage
export { app as server };
