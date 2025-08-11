import { Express } from "express";
import { logger } from "../utils/logger";

export const setupConversationRoutes = (app: Express, prefix: string) => {
  logger.info("Setting up conversation routes...");
  
  app.get(`${prefix}/conversations`, (req, res) => {
    res.json({ message: "Conversations endpoint - coming soon" });
  });
  
  logger.info("Conversation routes setup complete");
};
