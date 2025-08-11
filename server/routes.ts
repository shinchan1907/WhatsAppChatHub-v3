import { Express } from "express";
import { setupAuthRoutes } from "./routes/auth";
import { setupUserRoutes } from "./routes/users";
import { setupOrganizationRoutes } from "./routes/organizations";
import { setupWhatsAppRoutes } from "./routes/whatsapp";
import { setupContactRoutes } from "./routes/contacts";
import { setupConversationRoutes } from "./routes/conversations";
import { setupMessageRoutes } from "./routes/messages";
import { setupTemplateRoutes } from "./routes/templates";
import { setupBroadcastRoutes } from "./routes/broadcasts";
import { setupAutomationRoutes } from "./routes/automation";
import { setupIntegrationRoutes } from "./routes/integrations";
import { setupWebhookRoutes } from "./routes/webhooks";
import { setupAnalyticsRoutes } from "./routes/analytics";
import { setupCampaignRoutes } from "./routes/campaigns";
import { setupSegmentRoutes } from "./routes/segments";
import { setupAIRoutes } from "./routes/ai";
import { setupMediaRoutes } from "./routes/media";
import { setupSettingsRoutes } from "./routes/settings";
import { logger } from "./utils/logger";

export const setupRoutes = (app: Express) => {
  logger.info("Setting up API routes...");

  // ============================================================================
  // API VERSIONING
  // ============================================================================
  const API_VERSION = process.env.API_VERSION || "v1";
  const API_PREFIX = `/api/${API_VERSION}`;

  // ============================================================================
  // CORE ROUTES
  // ============================================================================

  // Authentication & User Management
  setupAuthRoutes(app, API_PREFIX);
  setupUserRoutes(app, API_PREFIX);
  setupOrganizationRoutes(app, API_PREFIX);

  // WhatsApp Business API
  setupWhatsAppRoutes(app, API_PREFIX);

  // Contact & Conversation Management
  setupContactRoutes(app, API_PREFIX);
  setupConversationRoutes(app, API_PREFIX);
  setupMessageRoutes(app, API_PREFIX);

  // Content & Broadcasting
  setupTemplateRoutes(app, API_PREFIX);
  setupBroadcastRoutes(app, API_PREFIX);
  setupCampaignRoutes(app, API_PREFIX);

  // Automation & Workflows
  setupAutomationRoutes(app, API_PREFIX);
  setupSegmentRoutes(app, API_PREFIX);

  // Integrations & Webhooks
  setupIntegrationRoutes(app, API_PREFIX);
  setupWebhookRoutes(app, API_PREFIX);

  // Analytics & AI
  setupAnalyticsRoutes(app, API_PREFIX);
  setupAIRoutes(app, API_PREFIX);

  // Media & Files
  setupMediaRoutes(app, API_PREFIX);

  // System & Settings
  setupSettingsRoutes(app, API_PREFIX);

  // ============================================================================
  // API DOCUMENTATION
  // ============================================================================
  
  app.get(`${API_PREFIX}/docs`, (req, res) => {
    res.json({
      message: "WhatsApp Business Hub API Documentation",
      version: API_VERSION,
      endpoints: {
        auth: `${API_PREFIX}/auth`,
        users: `${API_PREFIX}/users`,
        organizations: `${API_PREFIX}/organizations`,
        whatsapp: `${API_PREFIX}/whatsapp`,
        contacts: `${API_PREFIX}/contacts`,
        conversations: `${API_PREFIX}/conversations`,
        messages: `${API_PREFIX}/messages`,
        templates: `${API_PREFIX}/templates`,
        broadcasts: `${API_PREFIX}/broadcasts`,
        automation: `${API_PREFIX}/automation`,
        integrations: `${API_PREFIX}/integrations`,
        webhooks: `${API_PREFIX}/webhooks`,
        analytics: `${API_PREFIX}/analytics`,
        campaigns: `${API_PREFIX}/campaigns`,
        segments: `${API_PREFIX}/segments`,
        ai: `${API_PREFIX}/ai`,
        media: `${API_PREFIX}/media`,
        settings: `${API_PREFIX}/settings`,
      },
      documentation: "https://docs.whatsappbusinesshub.com",
      support: "https://support.whatsappbusinesshub.com",
    });
  });

  // ============================================================================
  // API STATUS & HEALTH
  // ============================================================================
  
  app.get(`${API_PREFIX}/status`, (req, res) => {
    res.json({
      status: "operational",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: "connected", // TODO: Add actual database health check
      redis: "connected", // TODO: Add actual Redis health check
    });
  });

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================
  
  app.get(`${API_PREFIX}/features`, (req, res) => {
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
        
        // Coming Soon
        flowBuilder: { enabled: false, plan: "enterprise", eta: "Q2 2024" },
        woocommerce: { enabled: false, plan: "enterprise", eta: "Q2 2024" },
        wordpress: { enabled: false, plan: "enterprise", eta: "Q2 2024" },
        shopify: { enabled: false, plan: "enterprise", eta: "Q3 2024" },
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // RATE LIMITING INFO
  // ============================================================================
  
  app.get(`${API_PREFIX}/rate-limits`, (req, res) => {
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
        messages: {
          windowMs: "1 minute",
          max: 60,
          description: "Message sending per organization",
        },
        broadcasts: {
          windowMs: "1 hour",
          max: 10,
          description: "Broadcast campaigns per organization",
        },
        webhooks: {
          windowMs: "1 minute",
          max: 1000,
          description: "Webhook calls per organization",
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // ERROR HANDLING FOR UNKNOWN ROUTES
  // ============================================================================
  
  app.use(`${API_PREFIX}/*`, (req, res) => {
    res.status(404).json({
      error: "Endpoint not found",
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
      code: "ENDPOINT_NOT_FOUND",
      availableEndpoints: [
        "GET /docs",
        "GET /status",
        "GET /features",
        "GET /rate-limits",
      ],
      timestamp: new Date().toISOString(),
    });
  });

  logger.info(`API routes setup complete. Base path: ${API_PREFIX}`);
};
