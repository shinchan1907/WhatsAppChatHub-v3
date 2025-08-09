import {
  users,
  contacts,
  conversations,
  messages,
  templates,
  broadcasts,
  appConfig,
  webhookLogs,
  type User,
  type InsertUser,
  type Contact,
  type InsertContact,
  type Conversation,
  type ConversationWithContact,
  type Message,
  type InsertMessage,
  type Template,
  type InsertTemplate,
  type Broadcast,
  type InsertBroadcast,
  type AppConfig,
  type InsertAppConfig,
  type WebhookLog,
  type InsertWebhookLog,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contact operations
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;

  // Conversation operations
  getConversations(): Promise<ConversationWithContact[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(contactId: string): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<void>;

  // Message operations
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageStatus(id: string, status: string): Promise<void>;

  // Template operations
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;

  // Broadcast operations
  getBroadcasts(): Promise<Broadcast[]>;
  getBroadcast(id: string): Promise<Broadcast | undefined>;
  createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast>;
  updateBroadcast(id: string, updates: Partial<Broadcast>): Promise<void>;

  // Configuration operations
  getAppConfig(userId: string): Promise<AppConfig | undefined>;
  updateAppConfig(userId: string, config: Partial<InsertAppConfig>): Promise<AppConfig>;

  // Webhook log operations
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  getWebhookLogs(limit?: number): Promise<WebhookLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private contacts: Map<string, Contact> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();
  private templates: Map<string, Template> = new Map();
  private broadcasts: Map<string, Broadcast> = new Map();
  private appConfigs: Map<string, AppConfig> = new Map();
  private webhookLogs: Map<string, WebhookLog> = new Map();

  constructor() {
    // Initialize with sample data
    this.initSampleData();
  }

  private initSampleData() {
    // Create default user
    const defaultUser: User = {
      id: randomUUID(),
      username: "admin",
      password: "admin123", // In production, this should be hashed
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);

    // Create sample templates
    const welcomeTemplate: Template = {
      id: randomUUID(),
      name: "Welcome Message",
      category: "greeting",
      content: "Hello {{customer_name}}! Welcome to our business. How can we help you today?",
      variables: ["customer_name"],
      isActive: true,
      createdAt: new Date(),
    };

    const catalogTemplate: Template = {
      id: randomUUID(),
      name: "Product Catalog",
      category: "marketing",
      content: "Hi {{customer_name}}! Check out our latest catalog with exclusive offers. Download here: {{catalog_link}}",
      variables: ["customer_name", "catalog_link"],
      isActive: true,
      createdAt: new Date(),
    };

    const orderTemplate: Template = {
      id: randomUUID(),
      name: "Order Confirmation",
      category: "transactional",
      content: "Thank you {{customer_name}}! Your order #{{order_id}} has been confirmed. Estimated delivery: {{delivery_date}}",
      variables: ["customer_name", "order_id", "delivery_date"],
      isActive: true,
      createdAt: new Date(),
    };

    this.templates.set(welcomeTemplate.id, welcomeTemplate);
    this.templates.set(catalogTemplate.id, catalogTemplate);
    this.templates.set(orderTemplate.id, orderTemplate);

    // Create sample contacts
    const contact1: Contact = {
      id: randomUUID(),
      name: "John Smith",
      phone: "+1234567890",
      email: "john@example.com",
      group: "customer",
      profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=48&h=48&fit=crop&crop=face",
      lastContact: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      createdAt: new Date(),
    };

    const contact2: Contact = {
      id: randomUUID(),
      name: "Sarah Johnson",
      phone: "+1234567891",
      email: "sarah@example.com",
      group: "vip",
      profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?ixlib=rb-4.0.3&w=48&h=48&fit=crop&crop=face",
      lastContact: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      createdAt: new Date(),
    };

    this.contacts.set(contact1.id, contact1);
    this.contacts.set(contact2.id, contact2);

    // Create sample conversations
    const conv1: Conversation = {
      id: randomUUID(),
      contactId: contact1.id,
      lastMessageId: "",
      unreadCount: 2,
      updatedAt: new Date(),
    };

    const conv2: Conversation = {
      id: randomUUID(),
      contactId: contact2.id,
      lastMessageId: "",
      unreadCount: 0,
      updatedAt: new Date(),
    };

    this.conversations.set(conv1.id, conv1);
    this.conversations.set(conv2.id, conv2);

    // Create sample messages
    const msg1: Message = {
      id: randomUUID(),
      conversationId: conv1.id,
      contactId: contact1.id,
      content: "Hi! I'm interested in your products. Can you tell me more about your pricing?",
      type: "text",
      direction: "inbound",
      status: "delivered",
      templateId: null,
      metadata: null,
      timestamp: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago
    };

    const msg2: Message = {
      id: randomUUID(),
      conversationId: conv1.id,
      contactId: contact1.id,
      content: "Hello! Thank you for your interest. I'd be happy to help you with our product information.",
      type: "text",
      direction: "outbound",
      status: "read",
      templateId: null,
      metadata: null,
      timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
    };

    const msg3: Message = {
      id: randomUUID(),
      conversationId: conv1.id,
      contactId: contact1.id,
      content: "Thank you for the quick response! This is exactly what I needed.",
      type: "text",
      direction: "inbound",
      status: "delivered",
      templateId: null,
      metadata: null,
      timestamp: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
    };

    this.messages.set(msg1.id, msg1);
    this.messages.set(msg2.id, msg2);
    this.messages.set(msg3.id, msg3);

    // Update last message IDs
    conv1.lastMessageId = msg3.id;
    conv2.lastMessageId = "";
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  // Contact operations
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = { 
      ...insertContact, 
      id, 
      createdAt: new Date(),
      group: insertContact.group || "customer",
      email: insertContact.email || null,
      profileImageUrl: insertContact.profileImageUrl || null,
      lastContact: insertContact.lastContact || null
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact> {
    const contact = this.contacts.get(id);
    if (!contact) throw new Error("Contact not found");
    
    const updatedContact = { ...contact, ...updates };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContact(id: string): Promise<void> {
    this.contacts.delete(id);
  }

  // Conversation operations
  async getConversations(): Promise<ConversationWithContact[]> {
    const conversations = Array.from(this.conversations.values());
    return conversations.map(conv => ({
      ...conv,
      contact: this.contacts.get(conv.contactId)!,
    })).filter(conv => conv.contact);
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(contactId: string): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      id,
      contactId,
      lastMessageId: "",
      unreadCount: 0,
      updatedAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const conversation = this.conversations.get(id);
    if (!conversation) throw new Error("Conversation not found");
    
    const updatedConversation = { ...conversation, ...updates };
    this.conversations.set(id, updatedConversation);
  }

  // Message operations
  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id, 
      timestamp: new Date(),
      type: insertMessage.type || "text",
      status: insertMessage.status || "sent",
      templateId: insertMessage.templateId || null,
      metadata: insertMessage.metadata || null
    };
    this.messages.set(id, message);
    
    // Update conversation
    await this.updateConversation(message.conversationId, {
      lastMessageId: id,
      updatedAt: new Date(),
    });
    
    return message;
  }

  async updateMessageStatus(id: string, status: string): Promise<void> {
    const message = this.messages.get(id);
    if (!message) throw new Error("Message not found");
    
    message.status = status;
    this.messages.set(id, message);
  }

  // Template operations
  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(t => t.isActive);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = { 
      ...insertTemplate, 
      id, 
      createdAt: new Date(),
      category: insertTemplate.category || "general",
      variables: insertTemplate.variables || null,
      isActive: insertTemplate.isActive !== undefined ? insertTemplate.isActive : true
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, updates: Partial<InsertTemplate>): Promise<Template> {
    const template = this.templates.get(id);
    if (!template) throw new Error("Template not found");
    
    const updatedTemplate = { ...template, ...updates };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (template) {
      template.isActive = false;
      this.templates.set(id, template);
    }
  }

  // Broadcast operations
  async getBroadcasts(): Promise<Broadcast[]> {
    return Array.from(this.broadcasts.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getBroadcast(id: string): Promise<Broadcast | undefined> {
    return this.broadcasts.get(id);
  }

  async createBroadcast(insertBroadcast: InsertBroadcast): Promise<Broadcast> {
    const id = randomUUID();
    const broadcast: Broadcast = { 
      ...insertBroadcast, 
      id, 
      createdAt: new Date(),
      sentAt: null
    };
    this.broadcasts.set(id, broadcast);
    return broadcast;
  }

  async updateBroadcast(id: string, updates: Partial<Broadcast>): Promise<void> {
    const broadcast = this.broadcasts.get(id);
    if (!broadcast) throw new Error("Broadcast not found");
    
    const updatedBroadcast = { ...broadcast, ...updates };
    this.broadcasts.set(id, updatedBroadcast);
  }

  // Configuration operations
  async getAppConfig(userId: string): Promise<AppConfig | undefined> {
    console.log("🔍 Getting config for user:", userId);
    const config = this.appConfigs.get(userId);
    console.log("📋 Config found:", config ? "yes" : "no", config ? Object.keys(config) : "none");
    return config;
  }

  async updateAppConfig(userId: string, config: Partial<InsertAppConfig>): Promise<AppConfig> {
    console.log("💾 Updating config for user:", userId);
    console.log("📝 Config data:", Object.keys(config));
    const existing = this.appConfigs.get(userId);
    const now = new Date();
    
    const appConfig: AppConfig = {
      id: existing?.id || randomUUID(),
      userId,
      whatsappAccessToken: config.whatsappAccessToken || existing?.whatsappAccessToken || null,
      whatsappPhoneNumberId: config.whatsappPhoneNumberId || existing?.whatsappPhoneNumberId || null,
      whatsappBusinessAccountId: config.whatsappBusinessAccountId || existing?.whatsappBusinessAccountId || null,
      whatsappWebhookVerifyToken: config.whatsappWebhookVerifyToken || existing?.whatsappWebhookVerifyToken || null,
      n8nWebhookUrl: config.n8nWebhookUrl || existing?.n8nWebhookUrl || null,
      n8nApiKey: config.n8nApiKey || existing?.n8nApiKey || null,
      n8nEnabled: config.n8nEnabled ?? existing?.n8nEnabled ?? false,
      enableLogging: config.enableLogging ?? existing?.enableLogging ?? true,
      webhookSecret: config.webhookSecret || existing?.webhookSecret || randomUUID(),
      isConfigured: config.isConfigured ?? (
        !!(config.whatsappAccessToken || existing?.whatsappAccessToken) && 
        !!(config.whatsappPhoneNumberId || existing?.whatsappPhoneNumberId)
      ),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    
    this.appConfigs.set(userId, appConfig);
    console.log("✅ Config saved with keys:", Object.keys(appConfig));
    console.log("🔑 Has access token:", !!appConfig.whatsappAccessToken);
    console.log("📱 Has phone number ID:", !!appConfig.whatsappPhoneNumberId);
    return appConfig;
  }

  // Webhook log operations
  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const id = randomUUID();
    const webhookLog: WebhookLog = {
      ...log,
      id,
      timestamp: new Date(),
    };
    this.webhookLogs.set(id, webhookLog);
    return webhookLog;
  }

  async getWebhookLogs(limit: number = 100): Promise<WebhookLog[]> {
    return Array.from(this.webhookLogs.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
