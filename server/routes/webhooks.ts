import { Express } from "express";
import { logger } from "../utils/logger";

export const setupWebhookRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up webhook routes...");
  
  app.get(`${prefix}/webhooks`, (req, res) => {
    res.json({ message: "Webhooks endpoint - coming soon" });
  });
  
  logger.info("Webhook routes setup complete");
};
