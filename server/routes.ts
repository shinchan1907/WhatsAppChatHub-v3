import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcrypt";
import session from "express-session";
import { storage } from "./storage";
import { insertContactSchema, insertMessageSchema, insertTemplateSchema, insertBroadcastSchema } from "@shared/schema";

interface AuthenticatedRequest extends Request {
  session: session.Session & session.SessionData & { userId?: string };
}

// Session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "whatsapp-business-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

// Authentication middleware
const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// WebSocket connection map
const wsConnections = new Map<string, WebSocket>();

// n8n integration helper
async function sendToN8n(endpoint: string, data: any) {
  const n8nUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";
  
  try {
    const response = await fetch(`${n8nUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.N8N_API_KEY || ""}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`n8n API error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("n8n integration error:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply session middleware
  app.use(sessionMiddleware);

  // Authentication routes
  app.post("/api/auth/login", async (req: AuthenticatedRequest, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // For demo purposes, using simple comparison. In production, use bcrypt
      const isValid = password === user.password;
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: AuthenticatedRequest, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ 
        id: user.id, 
        username: user.username 
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Contact routes
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", requireAuth, async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.put("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertContactSchema.partial().parse(req.body);
      const contact = await storage.updateContact(id, updates);
      res.json(contact);
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteContact(id);
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Message routes
  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      // Send to n8n for WhatsApp delivery
      if (messageData.direction === "outbound") {
        try {
          await sendToN8n("send-message", {
            phone: (await storage.getContact(messageData.contactId))?.phone,
            message: messageData.content,
            messageId: message.id,
          });
        } catch (n8nError) {
          console.error("n8n send error:", n8nError);
          // Update message status to failed
          await storage.updateMessageStatus(message.id, "failed");
        }
      }
      
      // Broadcast to WebSocket clients
      wsConnections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "new_message",
            data: message,
          }));
        }
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Template routes
  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ message: "Failed to get templates" });
    }
  });

  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Create template error:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(id, updates);
      res.json(template);
    } catch (error) {
      console.error("Update template error:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTemplate(id);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Delete template error:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Broadcast routes
  app.get("/api/broadcasts", requireAuth, async (req, res) => {
    try {
      const broadcasts = await storage.getBroadcasts();
      res.json(broadcasts);
    } catch (error) {
      console.error("Get broadcasts error:", error);
      res.status(500).json({ message: "Failed to get broadcasts" });
    }
  });

  app.post("/api/broadcasts", requireAuth, async (req, res) => {
    try {
      const broadcastData = insertBroadcastSchema.parse(req.body);
      const broadcast = await storage.createBroadcast(broadcastData);
      
      // Send to n8n for processing
      try {
        await sendToN8n("broadcast", {
          broadcastId: broadcast.id,
          templateId: broadcast.templateId,
          recipients: broadcast.recipients,
          variables: broadcast.variables,
        });
        
        await storage.updateBroadcast(broadcast.id, { status: "sending" });
      } catch (n8nError) {
        console.error("n8n broadcast error:", n8nError);
        await storage.updateBroadcast(broadcast.id, { status: "failed" });
      }
      
      res.status(201).json(broadcast);
    } catch (error) {
      console.error("Create broadcast error:", error);
      res.status(500).json({ message: "Failed to create broadcast" });
    }
  });

  // n8n webhook endpoints
  app.post("/api/webhooks/message-status", async (req, res) => {
    try {
      const { messageId, status } = req.body;
      await storage.updateMessageStatus(messageId, status);
      
      // Broadcast status update to WebSocket clients
      wsConnections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "message_status_update",
            data: { messageId, status },
          }));
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Message status webhook error:", error);
      res.status(500).json({ message: "Failed to update message status" });
    }
  });

  app.post("/api/webhooks/incoming-message", async (req, res) => {
    try {
      const { from, content, timestamp } = req.body;
      
      // Find or create contact
      let contact = (await storage.getContacts()).find(c => c.phone === from);
      if (!contact) {
        contact = await storage.createContact({
          name: `Contact ${from}`,
          phone: from,
          group: "customer",
        });
      }
      
      // Find or create conversation
      const conversations = await storage.getConversations();
      let conversation = conversations.find(c => c.contactId === contact!.id);
      if (!conversation) {
        const newConv = await storage.createConversation(contact.id);
        conversation = { ...newConv, contact: contact };
      }
      
      // Create message
      const message = await storage.createMessage({
        conversationId: conversation.id,
        contactId: contact.id,
        content,
        type: "text",
        direction: "inbound",
        status: "delivered",
        templateId: null,
        metadata: null,
      });
      
      // Broadcast to WebSocket clients
      wsConnections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "new_message",
            data: message,
          }));
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Incoming message webhook error:", error);
      res.status(500).json({ message: "Failed to process incoming message" });
    }
  });

  // Configuration routes
  app.get("/api/settings/config", requireAuth, async (req, res) => {
    try {
      const config = {
        n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || "",
        whatsappBusinessApiUrl: "https://graph.facebook.com/v18.0",
        whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
        whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
        enableLogging: process.env.ENABLE_LOGGING === "true",
        webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || "",
      };
      res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  app.post("/api/settings/config", requireAuth, async (req, res) => {
    try {
      res.json({ message: "Configuration saved successfully" });
    } catch (error) {
      console.error("Error saving config:", error);
      res.status(500).json({ message: "Failed to save configuration" });
    }
  });

  app.post("/api/settings/test-connection", requireAuth, async (req, res) => {
    try {
      const { type } = req.body;
      
      if (type === "n8n") {
        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        if (!n8nUrl) {
          return res.status(400).json({ message: "n8n webhook URL not configured" });
        }
        
        try {
          const testResponse = await fetch(`${n8nUrl}/test`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ test: true }),
          });
          
          if (testResponse.ok) {
            res.json({ message: "n8n connection successful" });
          } else {
            res.status(400).json({ message: "n8n connection failed" });
          }
        } catch (fetchError) {
          res.status(400).json({ message: "n8n connection failed: Network error" });
        }
      } else if (type === "whatsapp") {
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        if (!accessToken || !phoneNumberId) {
          return res.status(400).json({ message: "WhatsApp credentials not configured" });
        }
        
        try {
          const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
            },
          });
          
          if (whatsappResponse.ok) {
            res.json({ message: "WhatsApp API connection successful" });
          } else {
            res.status(400).json({ message: "WhatsApp API connection failed" });
          }
        } catch (fetchError) {
          res.status(400).json({ message: "WhatsApp API connection failed: Network error" });
        }
      } else {
        res.status(400).json({ message: "Invalid connection test type" });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      res.status(500).json({ message: "Connection test failed" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    const connectionId = Math.random().toString(36).substr(2, 9);
    wsConnections.set(connectionId, ws);
    
    ws.on("close", () => {
      wsConnections.delete(connectionId);
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      wsConnections.delete(connectionId);
    });
  });

  return httpServer;
}
