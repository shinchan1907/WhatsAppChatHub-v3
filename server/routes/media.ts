import { Express } from "express";
import { logger } from "../utils/logger";

export const setupMediaRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up media routes...");
  
  app.get(`${prefix}/media`, (req, res) => {
    res.json({ message: "Media endpoint - coming soon" });
  });
  
  logger.info("Media routes setup complete");
};
