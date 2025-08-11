import { Express } from "express";
import { logger } from "../utils/logger";

export const setupAutomationRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up automation routes...");
  
  app.get(`${prefix}/automation`, (req, res) => {
    res.json({ message: "Automation endpoint - coming soon" });
  });
  
  logger.info("Automation routes setup complete");
};
