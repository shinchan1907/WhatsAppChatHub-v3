import { Express } from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { logger } from "./utils/logger";

export const setupWebSocket = (app: Express) => {
  logger.info("Setting up WebSocket server...");

  try {
    const httpServer = createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? [process.env.FRONTEND_URL || "https://yourdomain.com"]
          : ["http://localhost:3000", "http://localhost:5000"],
        credentials: true,
      },
      path: "/socket.io",
    });

    // WebSocket connection handling
    io.on("connection", (socket) => {
      const organizationId = socket.handshake.auth.organizationId;
      const userId = socket.handshake.auth.userId;

      logger.info("WebSocket client connected", {
        socketId: socket.id,
        organizationId,
        userId,
      });

      // Join organization room
      if (organizationId) {
        socket.join(`org:${organizationId}`);
        logger.debug("Client joined organization room", {
          socketId: socket.id,
          organizationId,
        });
      }

      // Join user room
      if (userId) {
        socket.join(`user:${userId}`);
        logger.debug("Client joined user room", {
          socketId: socket.id,
          userId,
        });
      }

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        logger.info("WebSocket client disconnected", {
          socketId: socket.id,
          organizationId,
          userId,
          reason,
        });
      });

      // Handle errors
      socket.on("error", (error) => {
        logger.error("WebSocket error", {
          socketId: socket.id,
          organizationId,
          userId,
          error: error.message,
        });
      });
    });

    // Store io instance globally for use in other modules
    (global as any).io = io;

    logger.info("WebSocket server setup complete");
    return httpServer;
  } catch (error) {
    logger.error("Failed to setup WebSocket server", {
      error: error.message,
    });
    return null;
  }
};

// Helper function to emit events to organization
export const emitToOrganization = (organizationId: string, event: string, data: any) => {
  try {
    const io = (global as any).io;
    if (io) {
      io.to(`org:${organizationId}`).emit(event, data);
      logger.debug("Event emitted to organization", {
        event,
        organizationId,
        dataKeys: Object.keys(data),
      });
    }
  } catch (error) {
    logger.error("Failed to emit event to organization", {
      event,
      organizationId,
      error: error.message,
    });
  }
};

// Helper function to emit events to specific user
export const emitToUser = (userId: string, event: string, data: any) => {
  try {
    const io = (global as any).io;
    if (io) {
      io.to(`user:${userId}`).emit(event, data);
      logger.debug("Event emitted to user", {
        event,
        userId,
        dataKeys: Object.keys(data),
      });
    }
  } catch (error) {
    logger.error("Failed to emit event to user", {
      event,
      userId,
      error: error.message,
    });
  }
};
