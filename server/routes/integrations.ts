import { Express } from "express";
import { logger } from "../utils/logger";

export const setupIntegrationRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up integration routes...");
  
  app.get(`${prefix}/integrations`, (req, res) => {
    res.json({ message: "Integrations endpoint - coming soon" });
  });
  
  logger.info("Integration routes setup complete");
};
