import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  group: text("group").default("customer"),
  profileImageUrl: text("profile_image_url"),
  lastContact: timestamp("last_contact"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => contacts.id).notNull(),
  lastMessageId: varchar("last_message_id"),
  unreadCount: integer("unread_count").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id).notNull(),
  contactId: varchar("contact_id").references(() => contacts.id).notNull(),
  content: text("content").notNull(),
  type: text("type").default("text"), // text, template, media
  direction: text("direction").notNull(), // inbound, outbound
  status: text("status").default("sent"), // sent, delivered, read, failed
  templateId: varchar("template_id"),
  metadata: jsonb("metadata"), // For template variables, media info, etc.
  isRead: boolean("is_read").default(false), // For unread indicators
  readAt: timestamp("read_at"), // When message was read by customer
  timestamp: timestamp("timestamp").defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").default("general"),
  content: text("content").notNull(),
  variables: jsonb("variables"), // Array of variable names
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const broadcasts = pgTable("broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => templates.id).notNull(),
  recipients: jsonb("recipients").notNull(), // Array of contact IDs
  variables: jsonb("variables"), // Template variable values
  csvData: jsonb("csv_data"), // CSV upload data for bulk messaging
  status: text("status").default("pending"), // pending, sending, completed, failed
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  failedCount: integer("failed_count").default(0),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appConfig = pgTable("app_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  // WhatsApp Business API Configuration
  whatsappAccessToken: text("whatsapp_access_token"),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappBusinessAccountId: text("whatsapp_business_account_id"),
  whatsappWebhookVerifyToken: text("whatsapp_webhook_verify_token"),
  // n8n Integration (Optional)
  n8nWebhookUrl: text("n8n_webhook_url"),
  n8nApiKey: text("n8n_api_key"),
  n8nEnabled: boolean("n8n_enabled").default(false),
  // Database Configuration
  usePersistentDb: boolean("use_persistent_db").default(false),
  dbHost: text("db_host"),
  dbPort: text("db_port"),
  dbName: text("db_name"),
  dbUsername: text("db_username"),
  dbPassword: text("db_password"),
  // Media/CDN Configuration
  cdnType: text("cdn_type").default("none"), // none, bunny, aws, cloudinary
  bunnyApiKey: text("bunny_api_key"),
  bunnyStorageZone: text("bunny_storage_zone"),
  bunnyPullZone: text("bunny_pull_zone"),
  bunnyRegion: text("bunny_region").default("ny"), // ny, la, sg, etc.
  cdnBaseUrl: text("cdn_base_url"),
  // System Configuration
  enableLogging: boolean("enable_logging").default(true),
  webhookSecret: text("webhook_secret"),
  isConfigured: boolean("is_configured").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // whatsapp, n8n
  payload: jsonb("payload").notNull(),
  status: text("status").default("received"), // received, processed, failed
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export const insertAppConfigSchema = createInsertSchema(appConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type ConversationWithContact = Conversation & { contact: Contact };

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;

export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = z.infer<typeof insertAppConfigSchema>;

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
