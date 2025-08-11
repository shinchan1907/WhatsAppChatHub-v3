import { Express } from "express";
import { logger } from "../utils/logger";

export const setupMessageRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up message routes...");
  
  app.get(`${prefix}/messages`, (req, res) => {
    res.json({ message: "Messages endpoint - coming soon" });
  });
  
  logger.info("Message routes setup complete");
};
