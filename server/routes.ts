import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcrypt";
import session from "express-session";
import { storage } from "./storage";
import { WhatsAppAPIService } from "./whatsapp-api";
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
      
      console.log("🔐 Login attempt:", username);
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      console.log("👤 User found:", user ? "yes" : "no");
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Use bcrypt to compare password with hash
      console.log("🔑 Testing password...");
      const isValid = await bcrypt.compare(password, user.password);
      console.log("✅ Password valid:", isValid);
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

  // Template message route
  app.post("/api/messages/template", requireAuth, async (req: any, res) => {
    try {
      const { conversationId, contactId, templateId } = req.body;
      const userId = req.session.userId;

      if (!conversationId || !contactId || !templateId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get template details
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Get contact details
      const contact = await storage.getContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Create message record with template details
      const messageData = {
        conversationId,
        contactId,
        content: template.content,
        type: "template",
        direction: "outbound" as const,
        status: "sent" as const,
        templateId: templateId,
        metadata: {
          templateName: template.name,
          templateCategory: template.category
        },
      };

      const message = await storage.createMessage(messageData);

      // Send via WhatsApp API using template
      const config = await storage.getAppConfig(userId);
      if (config && config.whatsappAccessToken && config.whatsappPhoneNumberId) {
        console.log("📤 Sending template message via WhatsApp API");
        const whatsappService = new WhatsAppAPIService(config);
        
        const result = await whatsappService.sendTemplateMessage(
          contact.phone, 
          template.name,
          {} // No variables for now - can be enhanced later
        );
        
        if (result.success) {
          console.log("✅ Template message sent successfully");
          await storage.updateMessageStatus(message.id, "delivered");
        } else {
          console.error("❌ WhatsApp template send error:", result.error);
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
      console.error("Send template message error:", error);
      res.status(500).json({ message: "Failed to send template message" });
    }
  });

  // Message routes
  app.post("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const userId = req.session.userId;
      const message = await storage.createMessage(messageData);
      
      // Send via WhatsApp API for outbound messages
      if (messageData.direction === "outbound") {
        const config = await storage.getAppConfig(userId);
        console.log("📤 Sending outbound message, config:", config ? "found" : "not found");
        
        if (config && config.whatsappAccessToken && config.whatsappPhoneNumberId) {
          console.log("🚀 Using direct WhatsApp API");
          // Use direct WhatsApp API
          const whatsappService = new WhatsAppAPIService(config);
          const contact = await storage.getContact(messageData.contactId);
          
          if (contact?.phone) {
            console.log("📞 Sending to phone:", contact.phone);
            const result = await whatsappService.sendTextMessage(contact.phone, messageData.content);
            
            if (result.success) {
              console.log("✅ Message sent successfully");
              await storage.updateMessageStatus(message.id, "delivered");
            } else {
              console.error("❌ WhatsApp API send error:", result.error);
              await storage.updateMessageStatus(message.id, "failed");
            }
          } else {
            console.error("❌ No phone number found for contact");
            await storage.updateMessageStatus(message.id, "failed");
          }
        } else if (config?.n8nEnabled && config?.n8nWebhookUrl) {
          console.log("🔄 Using n8n fallback");
          // Fallback to n8n if configured
          try {
            const contact = await storage.getContact(messageData.contactId);
            await sendToN8n("send-message", {
              phone: contact?.phone,
              message: messageData.content,
              messageId: message.id,
            });
            await storage.updateMessageStatus(message.id, "sent");
          } catch (n8nError) {
            console.error("❌ n8n send error:", n8nError);
            await storage.updateMessageStatus(message.id, "failed");
          }
        } else {
          // No delivery method configured
          console.error("❌ No delivery method configured - missing WhatsApp credentials");
          
          if (config?.whatsappPhoneNumberId && !config?.whatsappAccessToken) {
            console.error("📱 Phone Number ID found but Access Token missing!");
            console.error("💡 Solution: Go to Settings → WhatsApp Business → Add your Access Token");
          }
          
          console.log("Config status:", {
            hasConfig: !!config,
            hasAccessToken: !!config?.whatsappAccessToken,
            hasPhoneNumberId: !!config?.whatsappPhoneNumberId,
            isConfigured: config?.isConfigured,
            n8nEnabled: config?.n8nEnabled
          });
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

  // Sync templates from Facebook Business Manager
  app.post("/api/templates/sync", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const config = await storage.getAppConfig(userId);
      
      if (!config || !config.whatsappAccessToken || !config.whatsappPhoneNumberId) {
        return res.status(400).json({ 
          message: "WhatsApp configuration is incomplete. Please configure your WhatsApp access token and phone number ID." 
        });
      }

      const whatsappService = new WhatsAppAPIService(config);
      const syncResult = await whatsappService.syncTemplatesFromFBM();

      if (!syncResult.success) {
        return res.status(400).json({ message: syncResult.error });
      }

      // Save templates to database
      let syncedCount = 0;
      for (const fbTemplate of syncResult.templates || []) {
        try {
          // Extract template content from Facebook template structure
          let content = fbTemplate.components?.find((c: any) => c.type === "BODY")?.text || fbTemplate.name;
          
          // Check if template already exists (avoid duplicates)
          const existingTemplates = await storage.getTemplates();
          const exists = existingTemplates.find(t => t.name === fbTemplate.name);
          
          if (!exists) {
            const templateData = {
              name: fbTemplate.name,
              content: content,
              language: fbTemplate.language || "en",
              category: fbTemplate.category?.toLowerCase() || "general",
              status: "approved",
              variables: fbTemplate.components?.find((c: any) => c.type === "BODY")?.example?.body_text?.[0] || [],
              facebookTemplateId: fbTemplate.id
            };

            console.log(`📋 Creating template: ${fbTemplate.name}`);
            await storage.createTemplate(templateData);
            syncedCount++;
          } else {
            console.log(`📋 Template ${fbTemplate.name} already exists, skipping`);
          }
        } catch (error) {
          console.warn(`Failed to sync template ${fbTemplate.name}:`, error);
        }
      }

      res.json({ 
        message: `Successfully synced ${syncedCount} templates from Facebook Business Manager`,
        synced: syncedCount,
        total: syncResult.templates?.length || 0 
      });
    } catch (error) {
      console.error("Template sync error:", error);
      res.status(500).json({ message: "Failed to sync templates" });
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
  app.get("/api/settings/config", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const config = await storage.getAppConfig(userId) || {
        whatsappAccessToken: "",
        whatsappPhoneNumberId: "",
        whatsappBusinessAccountId: "",
        whatsappWebhookVerifyToken: "",
        n8nWebhookUrl: "",
        n8nApiKey: "",
        n8nEnabled: false,
        enableLogging: true,
        webhookSecret: "",
        isConfigured: false,
      };
      res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  app.post("/api/settings/config", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      // Generate webhook secret if not provided
      if (!req.body.webhookSecret) {
        req.body.webhookSecret = "webhook_verify_token_123";
      }
      
      // Set isConfigured based on required fields
      if (req.body.whatsappAccessToken && req.body.whatsappPhoneNumberId) {
        req.body.isConfigured = true;
      }
      
      const config = await storage.updateAppConfig(userId, req.body);
      res.json({ message: "Configuration saved successfully", config });
    } catch (error) {
      console.error("Error saving config:", error);
      res.status(500).json({ message: "Failed to save configuration" });
    }
  });

  app.post("/api/settings/test-connection", requireAuth, async (req: any, res) => {
    try {
      const { type, config: providedConfig } = req.body;
      const userId = req.session.userId;
      const config = await storage.getAppConfig(userId);
      
      if (type === "n8n") {
        if (!config?.n8nWebhookUrl) {
          return res.status(400).json({ message: "n8n webhook URL not configured" });
        }
        
        try {
          const testResponse = await fetch(`${config.n8nWebhookUrl}/test`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ test: true, timestamp: Date.now() }),
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
        if (!config?.whatsappAccessToken || !config?.whatsappPhoneNumberId) {
          return res.status(400).json({ message: "WhatsApp credentials not configured" });
        }
        
        try {
          const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${config.whatsappPhoneNumberId}`, {
            headers: {
              "Authorization": `Bearer ${config.whatsappAccessToken}`,
            },
          });
          
          if (whatsappResponse.ok) {
            res.json({ message: "WhatsApp API connection successful" });
          } else {
            const result = await whatsappResponse.json();
            res.status(400).json({ message: result.error?.message || "WhatsApp API connection failed" });
          }
        } catch (fetchError) {
          res.status(400).json({ message: "WhatsApp API connection failed: Network error" });
        }
      } else if (type === "cdn") {
        const cdnConfig = providedConfig || config;
        
        if (!cdnConfig?.cdnType || cdnConfig.cdnType === "none") {
          return res.status(400).json({ message: "CDN not configured" });
        }
        
        try {
          if (cdnConfig.cdnType === "bunny") {
            if (!cdnConfig.bunnyApiKey || !cdnConfig.bunnyStorageZone) {
              return res.status(400).json({ message: "Bunny CDN credentials not configured" });
            }
            
            // Test Bunny CDN API connection
            const bunnyResponse = await fetch(`https://api.bunny.net/storage/${cdnConfig.bunnyStorageZone}/`, {
              method: "GET",
              headers: {
                "AccessKey": cdnConfig.bunnyApiKey,
              },
            });
            
            if (bunnyResponse.ok) {
              res.json({ message: "Bunny CDN connection successful" });
            } else {
              const result = await bunnyResponse.text();
              res.status(400).json({ message: `Bunny CDN connection failed: ${result}` });
            }
          } else if (cdnConfig.cdnType === "custom" && cdnConfig.cdnBaseUrl) {
            // Test custom CDN by checking if base URL is accessible
            const customResponse = await fetch(cdnConfig.cdnBaseUrl, {
              method: "HEAD",
            });
            
            if (customResponse.ok) {
              res.json({ message: "Custom CDN connection successful" });
            } else {
              res.status(400).json({ message: "Custom CDN connection failed" });
            }
          } else if (cdnConfig.cdnType === "aws") {
            res.json({ message: "AWS S3 connection test not implemented yet" });
          } else if (cdnConfig.cdnType === "cloudinary") {
            res.json({ message: "Cloudinary connection test not implemented yet" });
          } else {
            res.status(400).json({ message: "Unsupported CDN type" });
          }
        } catch (fetchError) {
          console.error("CDN test error:", fetchError);
          res.status(400).json({ message: "CDN connection failed: Network error" });
        }
      } else {
        res.status(400).json({ message: "Invalid connection test type" });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      res.status(500).json({ message: "Connection test failed" });
    }
  });

  // WhatsApp Webhook endpoints
  app.get("/api/webhooks/whatsapp", async (req, res) => {
    console.log("🔍 Webhook verification request:", req.query);
    
    // Webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log("📋 Verification details:", { mode, token, challenge });
    
    // For now, accept any verification token - in production, this should validate against stored config
    if (mode === 'subscribe' && challenge) {
      console.log('✅ Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      res.status(403).send('Forbidden');
    }
  });

  app.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      console.log("📨 Webhook received:", JSON.stringify(req.body, null, 2));
      
      // Log incoming webhook for debugging
      try {
        await storage.createWebhookLog({
          source: "whatsapp",
          payload: req.body,
          status: "received",
        });
      } catch (logError) {
        console.error("Failed to log webhook:", logError);
      }

      // Parse WhatsApp webhook payload
      if (req.body.entry) {
        for (const entry of req.body.entry) {
          console.log("📋 Processing entry:", entry.id);
          for (const change of entry.changes || []) {
            console.log("🔄 Processing change:", change.field);
            
            // Handle incoming messages
            if (change.value?.messages) {
              console.log("💬 Found messages:", change.value.messages.length);
              
              for (const msg of change.value.messages) {
                console.log("📩 Processing message from:", msg.from, "content:", msg.text?.body);
                
                try {
                  // Find or create conversation
                  const conversations = await storage.getConversations();
                  let conversation = conversations.find(c => 
                    c.contact?.phone === msg.from
                  );
                  
                  if (!conversation) {
                    console.log("👤 Creating new contact and conversation for:", msg.from);
                    // Create new contact and conversation
                    const contact = await storage.createContact({
                      name: `Contact ${msg.from}`,
                      phone: msg.from,
                      group: "customer",
                    });
                    
                    const newConversation = await storage.createConversation(contact.id);
                    conversation = { ...newConversation, contact };
                    console.log("✅ Created conversation:", newConversation.id);
                  }
                  
                  if (conversation) {
                    // Create incoming message
                    const message = await storage.createMessage({
                      conversationId: conversation.id,
                      contactId: conversation.contactId || conversation.contact?.id || "",
                      content: msg.text?.body || msg.type || "Media message",
                      direction: "inbound",
                      status: "delivered",
                    });
                    
                    console.log("✅ Created message:", message.id, "in conversation:", conversation.id);
                  
                    // Notify WebSocket clients
                    const wsMessage = {
                      type: "new_message",
                      data: message,
                    };
                    
                    console.log("📡 Broadcasting to", wsConnections.size, "WebSocket clients");
                    
                    wsConnections.forEach((ws) => {
                      if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(wsMessage));
                      }
                    });
                  }
                  
                } catch (msgError) {
                  console.error("❌ Error processing message:", msgError);
                }
              }
            }
            
            // Handle message status updates
            if (change.value?.statuses) {
              console.log("📊 Message status updates:", change.value.statuses.length);
              for (const status of change.value.statuses) {
                console.log("📈 Status update:", status.id, "->", status.status);
                
                try {
                  // Update message status in database
                  await storage.updateMessageStatus(status.id, status.status);
                  
                  // If message is read, update read timestamp
                  if (status.status === "read") {
                    await storage.updateMessageReadStatus(status.id, true, new Date());
                  }
                  
                  // Broadcast status update to WebSocket clients
                  const wsMessage = {
                    type: "message_status_update",
                    data: { 
                      messageId: status.id, 
                      status: status.status,
                      readAt: status.status === "read" ? new Date().toISOString() : null
                    },
                  };
                  
                  wsConnections.forEach((ws) => {
                    if (ws.readyState === WebSocket.OPEN) {
                      ws.send(JSON.stringify(wsMessage));
                    }
                  });
                  
                } catch (statusError) {
                  console.error("❌ Error updating message status:", statusError);
                }
              }
            }
          }
        }
      } else {
        console.log("⚠️ No entry found in webhook payload");
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      
      try {
        await storage.createWebhookLog({
          source: "whatsapp",
          payload: req.body,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (logError) {
        console.error("Failed to log webhook error:", logError);
      }
      
      res.status(500).send('Error');
    }
  });

  // Broadcast endpoints with enhanced functionality
  app.post("/api/broadcasts", requireAuth, async (req: any, res) => {
    try {
      const broadcastData = insertBroadcastSchema.parse(req.body);
      const userId = req.session.userId;
      
      // Get WhatsApp configuration
      const config = await storage.getAppConfig(userId);
      if (!config || !config.isConfigured) {
        return res.status(400).json({ message: "WhatsApp API not configured" });
      }
      
      const broadcast = await storage.createBroadcast(broadcastData);
      
      // Process broadcast immediately or schedule it
      if (!broadcastData.scheduledFor || new Date(broadcastData.scheduledFor) <= new Date()) {
        processBroadcast(broadcast, config);
      }
      
      res.status(201).json(broadcast);
    } catch (error) {
      console.error("Broadcast creation error:", error);
      res.status(500).json({ message: "Failed to create broadcast" });
    }
  });

  // Function to process broadcasts
  async function processBroadcast(broadcast: any, config: any) {
    try {
      const whatsappService = new WhatsAppAPIService(config);
      const template = await storage.getTemplate(broadcast.templateId);
      
      if (!template) {
        await storage.updateBroadcast(broadcast.id, { status: "failed" });
        return;
      }
      
      await storage.updateBroadcast(broadcast.id, { status: "sending", sentAt: new Date() });
      
      let sentCount = 0;
      let failedCount = 0;
      
      // Process recipients from CSV data or regular recipients
      const recipients = broadcast.csvData || broadcast.recipients;
      
      for (const recipientData of recipients) {
        try {
          let phoneNumber, variables;
          
          if (typeof recipientData === 'string') {
            // Regular recipient ID
            const contact = await storage.getContact(recipientData);
            phoneNumber = contact?.phone;
            variables = broadcast.variables || {};
          } else {
            // CSV data with phone and variables
            phoneNumber = recipientData.phone;
            variables = { ...broadcast.variables, ...recipientData };
          }
          
          if (!phoneNumber) {
            failedCount++;
            continue;
          }
          
          const result = await whatsappService.sendTemplateMessage(
            phoneNumber,
            template.name,
            variables
          );
          
          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }
          
          // Add delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          failedCount++;
          console.error("Broadcast send error:", error);
        }
      }
      
      await storage.updateBroadcast(broadcast.id, {
        status: "completed",
        sentCount,
        failedCount,
      });
      
    } catch (error) {
      console.error("Broadcast processing error:", error);
      await storage.updateBroadcast(broadcast.id, { status: "failed" });
    }
  }

  // Media upload endpoint for chat
  app.post("/api/messages/media", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { conversationId, contactId, mediaType, mediaData, caption, filename } = req.body;
      
      if (!mediaData || !mediaType || !conversationId || !contactId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get config for WhatsApp API
      const config = await storage.getAppConfig(req.session.userId!);
      if (!config) {
        return res.status(400).json({ message: "WhatsApp configuration not found" });
      }

      // Get contact phone number
      const contact = await storage.getContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const whatsappService = new WhatsAppAPIService(config);
      
      // Convert base64 to buffer
      const buffer = Buffer.from(mediaData, 'base64');
      
      // Upload media to WhatsApp
      const uploadResult = await whatsappService.uploadMedia(buffer, mediaType, filename);
      
      if (!uploadResult.success || !uploadResult.mediaId) {
        return res.status(400).json({ message: uploadResult.error || "Failed to upload media" });
      }

      // Send media message
      const sendResult = await whatsappService.sendMediaMessage(
        contact.phone,
        mediaType as 'image' | 'video' | 'document',
        uploadResult.mediaId,
        caption,
        filename
      );

      if (!sendResult.success) {
        return res.status(400).json({ message: sendResult.error || "Failed to send media message" });
      }

      // Store message in database
      const message = await storage.createMessage({
        conversationId,
        contactId,
        content: caption || `${mediaType} message`,
        type: "media",
        direction: "outbound",
        status: "sent",
        templateId: null,
        metadata: {
          mediaType,
          mediaId: uploadResult.mediaId,
          filename,
          caption
        },
      });

      // Broadcast to all connected WebSocket clients
      wsConnections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "new_message",
            message,
          }));
        }
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending media message:", error);
      res.status(500).json({ message: "Failed to send media message" });
    }
  });

  // Template with variables endpoint
  app.post("/api/messages/template-with-variables", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { conversationId, contactId, templateId, variables } = req.body;
      
      if (!conversationId || !contactId || !templateId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get template details
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Get contact details
      const contact = await storage.getContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Get config for WhatsApp API
      const config = await storage.getAppConfig(req.session.userId!);
      if (!config) {
        return res.status(400).json({ message: "WhatsApp configuration not found" });
      }

      const whatsappService = new WhatsAppAPIService(config);
      
      // Send template message with variables
      const result = await whatsappService.sendTemplateMessage(
        contact.phone, 
        template.name,
        variables || {}
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error || "Failed to send template message" });
      }

      // Create message record with template details and variables
      const messageData = {
        conversationId,
        contactId,
        content: template.content,
        type: "template",
        direction: "outbound" as const,
        status: "sent" as const,
        templateId: templateId,
        metadata: {
          templateName: template.name,
          templateCategory: template.category,
          variables: variables
        },
      };

      const message = await storage.createMessage(messageData);

      // Broadcast to all connected WebSocket clients
      wsConnections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "new_message",
            message,
          }));
        }
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending template message with variables:", error);
      res.status(500).json({ message: "Failed to send template message" });
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
