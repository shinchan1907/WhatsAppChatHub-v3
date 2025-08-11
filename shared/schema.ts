import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, decimal, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// CORE USER & ORGANIZATION MANAGEMENT
// ============================================================================

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),
  logo: text("logo"),
  plan: text("plan").default("starter"), // starter, professional, enterprise
  status: text("status").default("active"), // active, suspended, cancelled
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"),
  role: text("role").default("user"), // owner, admin, manager, user
  permissions: jsonb("permissions").default([]),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// WHATSAPP BUSINESS API INTEGRATION
// ============================================================================

export const whatsappAccounts = pgTable("whatsapp_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull().unique(),
  phoneNumberId: text("phone_number_id").notNull(),
  businessAccountId: text("business_account_id").notNull(),
  accessToken: text("access_token").notNull(),
  webhookVerifyToken: text("webhook_verify_token"),
  status: text("status").default("active"), // active, inactive, suspended
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const whatsappWebhooks = pgTable("whatsapp_webhooks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  whatsappAccountId: uuid("whatsapp_account_id").references(() => whatsappAccounts.id).notNull(),
  url: text("url").notNull(),
  events: jsonb("events").default([]), // message, status_update, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// CONTACT & CUSTOMER MANAGEMENT
// ============================================================================

export const contactGroups = pgTable("contact_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"),
  isSystem: boolean("is_system").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  phone: text("phone").notNull(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  language: text("language").default("en"),
  timezone: text("timezone"),
  location: jsonb("location"), // {country, city, coordinates}
  tags: jsonb("tags").default([]),
  customFields: jsonb("custom_fields").default({}),
  metadata: jsonb("metadata").default({}),
  isActive: boolean("is_active").default(true),
  lastContact: timestamp("last_contact"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contactGroupMembers = pgTable("contact_group_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  groupId: uuid("group_id").references(() => contactGroups.id).notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// ============================================================================
// CONVERSATION & MESSAGING
// ============================================================================

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  whatsappAccountId: uuid("whatsapp_account_id").references(() => whatsappAccounts.id).notNull(),
  status: text("status").default("open"), // open, closed, archived
  priority: text("priority").default("normal"), // low, normal, high, urgent
  assignedTo: uuid("assigned_to").references(() => users.id),
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),
  lastMessageAt: timestamp("last_message_at"),
  lastMessageId: uuid("last_message_id"),
  unreadCount: integer("unread_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  whatsappAccountId: uuid("whatsapp_account_id").references(() => whatsappAccounts.id).notNull(),
  type: text("type").notNull(), // text, image, video, audio, document, location, contact, sticker
  direction: text("direction").notNull(), // inbound, outbound
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  mediaSize: integer("media_size"),
  mediaDuration: integer("media_duration"),
  mediaThumbnail: text("media_thumbnail"),
  replyTo: uuid("reply_to").references(() => messages.id),
  status: text("status").default("sent"), // sent, delivered, read, failed
  statusDetails: jsonb("status_details").default({}),
  pricing: jsonb("pricing").default({}),
  metadata: jsonb("metadata").default({}),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// TEMPLATES & BROADCASTING
// ============================================================================

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  category: text("category").default("general"),
  language: text("language").default("en"),
  content: text("content").notNull(),
  variables: jsonb("variables").default([]),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  status: text("status").default("pending"), // pending, approved, rejected
  rejectionReason: text("rejection_reason"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").default("template"), // template, custom, flow
  templateId: uuid("template_id").references(() => messageTemplates.id),
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  recipients: jsonb("recipients").notNull(), // Array of contact IDs or group IDs
  variables: jsonb("variables").default({}),
  csvData: jsonb("csv_data"),
  status: text("status").default("draft"), // draft, scheduled, sending, completed, failed, cancelled
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  stats: jsonb("stats").default({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    pending: 0
  }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// AUTOMATION & WORKFLOWS
// ============================================================================

export const automationFlows = pgTable("automation_flows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(), // message_received, contact_created, time_based, webhook
  triggerConfig: jsonb("trigger_config").notNull(),
  nodes: jsonb("nodes").notNull(), // Flow builder nodes
  edges: jsonb("edges").notNull(), // Flow builder edges
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const automationExecutions = pgTable("automation_executions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  flowId: uuid("flow_id").references(() => automationFlows.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  status: text("status").default("running"), // running, completed, failed, cancelled
  currentNode: text("current_node"),
  executionPath: jsonb("execution_path").default([]),
  variables: jsonb("variables").default({}),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
});

// ============================================================================
// INTEGRATIONS & WEBHOOKS
// ============================================================================

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // woocommerce, wordpress, shopify, zapier, n8n, custom
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  events: jsonb("events").default([]),
  headers: jsonb("headers").default({}),
  isActive: boolean("is_active").default(true),
  secret: text("secret"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const webhookLogs = pgTable("webhook_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  webhookId: uuid("webhook_id").references(() => webhooks.id).notNull(),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  response: jsonb("response"),
  status: text("status").default("pending"), // pending, success, failed
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  nextRetry: timestamp("next_retry"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  event: text("event").notNull(), // message_sent, message_delivered, message_read, contact_created, etc.
  entityType: text("entity_type"), // message, contact, conversation, broadcast
  entityId: uuid("entity_id"),
  contactId: uuid("contact_id").references(() => contacts.id),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const analyticsMetrics = pgTable("analytics_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  metric: text("metric").notNull(), // delivery_rate, open_rate, response_time, etc.
  value: decimal("value", { precision: 10, scale: 4 }).notNull(),
  period: text("period").notNull(), // daily, weekly, monthly
  date: timestamp("date").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// CUSTOMER SEGMENTATION & TARGETING
// ============================================================================

export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").notNull(), // Segmentation rules
  isDynamic: boolean("is_dynamic").default(true),
  contactCount: integer("contact_count").default(0),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const segmentMembers = pgTable("segment_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  segmentId: uuid("segment_id").references(() => segments.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// ============================================================================
// CAMPAIGNS & MARKETING
// ============================================================================

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").default("broadcast"), // broadcast, drip, trigger
  status: text("status").default("draft"), // draft, active, paused, completed
  segments: jsonb("segments").default([]),
  messages: jsonb("messages").notNull(),
  schedule: jsonb("schedule").default({}),
  stats: jsonb("stats").default({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    opened: 0,
    clicked: 0
  }),
  metadata: jsonb("metadata").default({}),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// AI & MACHINE LEARNING FEATURES
// ============================================================================

export const aiModels = pgTable("ai_models", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // sentiment_analysis, intent_detection, auto_reply, lead_scoring
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").default(true),
  accuracy: decimal("accuracy", { precision: 5, scale: 4 }),
  lastTrained: timestamp("last_trained"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiPredictions = pgTable("ai_predictions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  modelId: uuid("model_id").references(() => aiModels.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  input: jsonb("input").notNull(),
  prediction: jsonb("prediction").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// SYSTEM & AUDIT LOGS
// ============================================================================

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemLogs = pgTable("system_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id),
  level: text("level").notNull(), // debug, info, warn, error, fatal
  message: text("message").notNull(),
  context: jsonb("context").default({}),
  stackTrace: text("stack_trace"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// INSERT SCHEMAS
// ============================================================================

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappAccountSchema = createInsertSchema(whatsappAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationFlowSchema = createInsertSchema(automationFlows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactGroupSchema = createInsertSchema(contactGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSegmentSchema = createInsertSchema(segments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// TYPES
// ============================================================================

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WhatsappAccount = typeof whatsappAccounts.$inferSelect;
export type InsertWhatsappAccount = z.infer<typeof insertWhatsappAccountSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type ContactGroup = typeof contactGroups.$inferSelect;
export type InsertContactGroup = z.infer<typeof insertContactGroupSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type ConversationWithContact = Conversation & { contact: Contact };

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertTemplateSchema>;

export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;

export type AutomationFlow = typeof automationFlows.$inferSelect;
export type InsertAutomationFlow = z.infer<typeof insertAutomationFlowSchema>;

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;

export type Segment = typeof segments.$inferSelect;
export type InsertSegment = z.infer<typeof insertSegmentSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;
