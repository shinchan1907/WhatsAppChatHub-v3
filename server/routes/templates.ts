import { Express } from "express";
import { logger } from "../utils/logger";

export const setupTemplateRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up template routes...");
  
  app.get(`${prefix}/templates`, (req, res) => {
    res.json({ message: "Templates endpoint - coming soon" });
  });
  
  logger.info("Template routes setup complete");
};
