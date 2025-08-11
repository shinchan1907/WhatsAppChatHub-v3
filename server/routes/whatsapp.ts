import { Express } from "express";
import { logger } from "../utils/logger";

export const setupWhatsAppRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up WhatsApp routes...");
  
  app.get(`${prefix}/whatsapp`, (req, res) => {
    res.json({ message: "WhatsApp endpoint - coming soon" });
  });
  
  logger.info("WhatsApp routes setup complete");
};
