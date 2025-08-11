import { Express } from "express";
import { logger } from "../utils/logger";

export const setupCampaignRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up campaign routes...");
  
  app.get(`${prefix}/campaigns`, (req, res) => {
    res.json({ message: "Campaigns endpoint - coming soon" });
  });
  
  logger.info("Campaign routes setup complete");
};
