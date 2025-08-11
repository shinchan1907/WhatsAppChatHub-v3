import { Express } from "express";
import { logger } from "../utils/logger";

export const setupSegmentRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up segment routes...");
  
  app.get(`${prefix}/segments`, (req, res) => {
    res.json({ message: "Segments endpoint - coming soon" });
  });
  
  logger.info("Segment routes setup complete");
};
