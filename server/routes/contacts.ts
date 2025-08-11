import { Express } from "express";
import { logger } from "../utils/logger";

export const setupContactRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up contact routes...");
  
  app.get(`${prefix}/contacts`, (req, res) => {
    res.json({ message: "Contacts endpoint - coming soon" });
  });
  
  logger.info("Contact routes setup complete");
};
