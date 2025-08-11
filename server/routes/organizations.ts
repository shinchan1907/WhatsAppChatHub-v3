import { Express } from "express";
import { logger } from "../utils/logger";

export const setupOrganizationRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up organization routes...");
  
  app.get(`${prefix}/organizations`, (req, res) => {
    res.json({ message: "Organizations endpoint - coming soon" });
  });
  
  logger.info("Organization routes setup complete");
};
