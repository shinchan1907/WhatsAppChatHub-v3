import { Express } from "express";
import { logger } from "../utils/logger";

export const setupUserRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up user routes...");
  
  app.get(`${prefix}/users`, (req, res) => {
    res.json({ message: "Users endpoint - coming soon" });
  });
  
  logger.info("User routes setup complete");
};
