import { Express } from "express";
import { logger } from "../utils/logger";

export const setupBroadcastRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up broadcast routes...");
  
  app.get(`${prefix}/broadcasts`, (req, res) => {
    res.json({ message: "Broadcasts endpoint - coming soon" });
  });
  
  logger.info("Broadcast routes setup complete");
};
