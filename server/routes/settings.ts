import { Express } from "express";
import { logger } from "../utils/logger";

export const setupSettingsRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up settings routes...");
  
  app.get(`${prefix}/settings`, (req, res) => {
    res.json({ message: "Settings endpoint - coming soon" });
  });
  
  logger.info("Settings routes setup complete");
};
