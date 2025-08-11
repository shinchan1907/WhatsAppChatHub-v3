import { Express } from "express";
import { logger } from "../utils/logger";

export const setupAIRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up AI routes...");
  
  app.get(`${prefix}/ai`, (req, res) => {
    res.json({ message: "AI endpoint - coming soon" });
  });
  
  logger.info("AI routes setup complete");
};
