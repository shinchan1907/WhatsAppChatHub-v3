import { Express } from "express";
import { logger } from "../utils/logger";

export const setupAnalyticsRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up analytics routes...");
  
  app.get(`${prefix}/analytics`, (req, res) => {
    res.json({ message: "Analytics endpoint - coming soon" });
  });
  
  logger.info("Analytics routes setup complete");
};
