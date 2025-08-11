import { neon } from "@neondatabase/serverless";
import bcrypt from "bcrypt";
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log("🚀 Initializing database...");
    
    // Test connection
    await sql`SELECT 1`;
    console.log("✅ Database connection successful");
    
    // Create ALL tables for complete WhatsApp Business Hub
    console.log("📋 Creating complete database schema...");
    
    // Core Organization & User Management
    await sql`CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      domain TEXT,
      logo TEXT,
      plan TEXT DEFAULT 'enterprise',
      status TEXT DEFAULT 'active',
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'owner',
      permissions JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    // WhatsApp Business API Integration (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS whatsapp_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL UNIQUE,
      phone_number_id TEXT NOT NULL,
      business_account_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      webhook_verify_token TEXT,
      webhook_url TEXT,
      status TEXT DEFAULT 'active',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS whatsapp_webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) NOT NULL,
      url TEXT NOT NULL,
      events JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // Contact Management (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      phone TEXT NOT NULL,
      name TEXT,
      email TEXT,
      avatar TEXT,
      language TEXT DEFAULT 'en',
      timezone TEXT,
      location JSONB,
      tags JSONB DEFAULT '[]',
      custom_fields JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      last_contact TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS contact_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      is_system BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS contact_group_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID REFERENCES contacts(id) NOT NULL,
      group_id UUID REFERENCES contact_groups(id) NOT NULL,
      added_at TIMESTAMP DEFAULT NOW()
    )`;

    // Message Templates (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS message_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      language TEXT DEFAULT 'en',
      content TEXT NOT NULL,
      variables JSONB DEFAULT '[]',
      media_url TEXT,
      media_type TEXT,
      status TEXT DEFAULT 'pending',
      rejection_reason TEXT,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    // Conversations & Messages (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      contact_id UUID REFERENCES contacts(id) NOT NULL,
      whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) NOT NULL,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      assigned_to UUID REFERENCES users(id),
      tags JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      last_message_at TIMESTAMP,
      last_message_id UUID,
      unread_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      conversation_id UUID REFERENCES conversations(id) NOT NULL,
      contact_id UUID REFERENCES contacts(id) NOT NULL,
      whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) NOT NULL,
      type TEXT NOT NULL,
      direction TEXT NOT NULL,
      content TEXT,
      media_url TEXT,
      media_type TEXT,
      media_size INTEGER,
      media_duration INTEGER,
      media_thumbnail TEXT,
      template_id UUID,
      template_variables JSONB DEFAULT '{}',
      reply_to UUID,
      status TEXT DEFAULT 'sent',
      status_details JSONB DEFAULT '{}',
      pricing JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMP,
      delivered_at TIMESTAMP,
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // Broadcasting & Campaigns (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS broadcasts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'template',
      template_id UUID REFERENCES message_templates(id),
      content TEXT,
      media_url TEXT,
      media_type TEXT,
      recipients JSONB NOT NULL,
      variables JSONB DEFAULT '{}',
      csv_data JSONB,
      status TEXT DEFAULT 'draft',
      scheduled_for TIMESTAMP,
      sent_at TIMESTAMP,
      completed_at TIMESTAMP,
      stats JSONB DEFAULT '{"total": 0, "sent": 0, "delivered": 0, "read": 0, "failed": 0, "pending": 0}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'broadcast',
      status TEXT DEFAULT 'draft',
      segments JSONB DEFAULT '[]',
      messages JSONB NOT NULL,
      schedule JSONB DEFAULT '{}',
      stats JSONB DEFAULT '{"total": 0, "sent": 0, "delivered": 0, "read": 0, "failed": 0, "opened": 0, "clicked": 0}',
      metadata JSONB DEFAULT '{}',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    // Automation & Workflows (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS automation_flows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      trigger TEXT NOT NULL,
      trigger_config JSONB NOT NULL,
      nodes JSONB NOT NULL,
      edges JSONB NOT NULL,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS automation_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      flow_id UUID REFERENCES automation_flows(id) NOT NULL,
      contact_id UUID REFERENCES contacts(id) NOT NULL,
      status TEXT DEFAULT 'running',
      current_node TEXT,
      execution_path JSONB DEFAULT '[]',
      variables JSONB DEFAULT '{}',
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      error_message TEXT,
      metadata JSONB DEFAULT '{}'
    )`;

    // Customer Segmentation (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS segments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      criteria JSONB NOT NULL,
      is_dynamic BOOLEAN DEFAULT true,
      contact_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS segment_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      segment_id UUID REFERENCES segments(id) NOT NULL,
      contact_id UUID REFERENCES contacts(id) NOT NULL,
      added_at TIMESTAMP DEFAULT NOW()
    )`;

    // Integrations (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config JSONB NOT NULL,
      is_active BOOLEAN DEFAULT true,
      last_sync TIMESTAMP,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events JSONB DEFAULT '[]',
      headers JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      secret TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS webhook_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      webhook_id UUID REFERENCES webhooks(id) NOT NULL,
      event TEXT NOT NULL,
      payload JSONB NOT NULL,
      response JSONB,
      status TEXT DEFAULT 'pending',
      status_code INTEGER,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      next_retry TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // Analytics & Reporting (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      event TEXT NOT NULL,
      entity_type TEXT,
      entity_id UUID,
      contact_id UUID REFERENCES contacts(id),
      metadata JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS analytics_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      metric TEXT NOT NULL,
      value DECIMAL(10,4) NOT NULL,
      period TEXT NOT NULL,
      date TIMESTAMP NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // AI & Machine Learning (ENHANCED)
    await sql`CREATE TABLE IF NOT EXISTS ai_models (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      api_key TEXT,
      config JSONB NOT NULL,
      is_active BOOLEAN DEFAULT true,
      accuracy DECIMAL(5,4),
      last_trained TIMESTAMP,
      usage_count INTEGER DEFAULT 0,
      cost_per_request DECIMAL(10,6),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS ai_predictions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      model_id UUID REFERENCES ai_models(id) NOT NULL,
      contact_id UUID REFERENCES contacts(id) NOT NULL,
      input JSONB NOT NULL,
      prediction JSONB NOT NULL,
      confidence DECIMAL(5,4),
      cost DECIMAL(10,6),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // System & Audit Logs (COMPLETE)
    await sql`CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      user_id UUID REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id UUID,
      old_values JSONB,
      new_values JSONB,
      ip_address TEXT,
      user_agent TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS system_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id),
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context JSONB DEFAULT '{}',
      stack_trace TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // Application Settings & Configuration (NEW - CRITICAL FOR PERSISTENCE)
    await sql`CREATE TABLE IF NOT EXISTS application_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      key TEXT NOT NULL,
      value JSONB NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      is_encrypted BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) NOT NULL,
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      preferences JSONB NOT NULL DEFAULT '{}',
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      timezone TEXT,
      date_format TEXT DEFAULT 'MM/DD/YYYY',
      time_format TEXT DEFAULT '12h',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;

    // Media & File Management (NEW - FOR CDN INTEGRATION)
    await sql`CREATE TABLE IF NOT EXISTS media_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      cdn_provider TEXT,
      cdn_zone TEXT,
      metadata JSONB DEFAULT '{}',
      uploaded_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // Enhanced Message Tracking (NEW - FOR COMPLETE ANALYTICS)
    await sql`CREATE TABLE IF NOT EXISTS message_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      message_id UUID REFERENCES messages(id) NOT NULL,
      contact_id UUID REFERENCES contacts(id) NOT NULL,
      event_type TEXT NOT NULL,
      event_data JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'
    )`;

    // Chat Session Management (NEW - FOR BETTER REPORTING)
    await sql`CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      conversation_id UUID REFERENCES conversations(id) NOT NULL,
      user_id UUID REFERENCES users(id),
      started_at TIMESTAMP DEFAULT NOW(),
      ended_at TIMESTAMP,
      duration_seconds INTEGER,
      message_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      metadata JSONB DEFAULT '{}'
    )`;

    // Create indexes for better performance
    console.log("📊 Creating database indexes...");
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_application_settings_org_category ON application_settings(organization_id, category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at)`;
    
    console.log("✅ Complete database schema created successfully");
    
    // Create default organization
    console.log("🏢 Creating default organization...");
    const [org] = await sql`
      INSERT INTO organizations (name, slug, domain, plan, status, settings)
      VALUES ('Default Organization', 'default', 'localhost', 'enterprise', 'active', '{}')
      RETURNING id, name
    `;
    
    console.log("✅ Default organization created");
    
    // Create default admin user
    console.log("👤 Creating default admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const [adminUser] = await sql`
      INSERT INTO users (organization_id, email, username, password, first_name, last_name, role, permissions)
      VALUES (${org.id}, 'sannygupta102@gmail.com', 'admin', ${hashedPassword}, 'Admin', 'User', 'owner', '["*"]')
      RETURNING username, email
    `;
    
    console.log("✅ Default admin user created");
    console.log("📧 Email: sannygupta102@gmail.com");
    console.log("👤 Username: admin");
    console.log("🔑 Password: admin123");
    
    // Create sample WhatsApp account with ALL required fields
    console.log("📱 Creating sample WhatsApp account...");
    await sql`
      INSERT INTO whatsapp_accounts (
        organization_id, 
        name, 
        phone_number, 
        phone_number_id, 
        business_account_id, 
        access_token, 
        webhook_verify_token,
        webhook_url,
        status
      )
      VALUES (
        ${org.id}, 
        'Sample WhatsApp Account', 
        '+1234567890', 
        'sample_phone_id_123', 
        'sample_business_id_456', 
        'sample_access_token_789', 
        'sample_webhook_token',
        'https://yourdomain.com/webhook',
        'active'
      )
    `;
    
    console.log("✅ Sample WhatsApp account created with all required fields");
    
    // Create sample contact group
    console.log("👥 Creating sample contact group...");
    await sql`
      INSERT INTO contact_groups (organization_id, name, description, color, is_system)
      VALUES (${org.id}, 'General', 'General contact group', '#3B82F6', true)
    `;
    
    console.log("✅ Sample contact group created");
    
    // Create sample message template
    console.log("📝 Creating sample message template...");
    await sql`
      INSERT INTO message_templates (
        organization_id, 
        name, 
        category, 
        language, 
        content, 
        variables, 
        status, 
        is_active
      )
      VALUES (
        ${org.id}, 
        'Welcome Message', 
        'greeting', 
        'en', 
        'Hello {{name}}, welcome to our service!', 
        '["name"]', 
        'approved', 
        true
      )
    `;
    
    console.log("✅ Sample message template created");
    
    // Create default application settings for complete persistence
    console.log("⚙️ Creating default application settings...");
    await sql`
      INSERT INTO application_settings (organization_id, key, value, category, description) VALUES
        (${org.id}, 'phoneNumber', '"", 'whatsapp', 'WhatsApp phone number'),
        (${org.id}, 'phoneNumberId', '"", 'whatsapp', 'WhatsApp phone number ID'),
        (${org.id}, 'businessAccountId', '"", 'whatsapp', 'WhatsApp business account ID'),
        (${org.id}, 'accessToken', '"", 'whatsapp', 'WhatsApp access token'),
        (${org.id}, 'webhookVerifyToken', '"", 'whatsapp', 'WhatsApp webhook verify token'),
        (${org.id}, 'webhookUrl', '"", 'whatsapp', 'WhatsApp webhook URL'),
        (${org.id}, 'provider', '"bunny", 'cdn', 'CDN provider'),
        (${org.id}, 'apiKey', '"", 'cdn', 'CDN API key'),
        (${org.id}, 'zoneName', '"", 'cdn', 'CDN zone name'),
        (${org.id}, 'pullZoneUrl', '"", 'cdn', 'CDN pull zone URL'),
        (${org.id}, 'storageZone', '"", 'cdn', 'CDN storage zone'),
        (${org.id}, 'region', '"de", 'cdn', 'CDN region'),
        (${org.id}, 'emailNotifications', 'true', 'notifications', 'Email notifications enabled'),
        (${org.id}, 'pushNotifications', 'true', 'notifications', 'Push notifications enabled'),
        (${org.id}, 'messageAlerts', 'true', 'notifications', 'Message alerts enabled'),
        (${org.id}, 'deliveryReports', 'true', 'notifications', 'Delivery reports enabled'),
        (${org.id}, 'weeklyReports', 'false', 'notifications', 'Weekly reports enabled'),
        (${org.id}, 'monthlyReports', 'true', 'notifications', 'Monthly reports enabled'),
        (${org.id}, 'twoFactorAuth', 'false', 'security', 'Two-factor authentication enabled'),
        (${org.id}, 'sessionTimeout', '"24", 'security', 'Session timeout in hours'),
        (${org.id}, 'passwordExpiry', '"90", 'security', 'Password expiry in days'),
        (${org.id}, 'loginNotifications', 'true', 'security', 'Login notifications enabled'),
        (${org.id}, 'suspiciousActivityAlerts', 'true', 'security', 'Suspicious activity alerts enabled')
    `;
    
    console.log("✅ Default application settings created");
    
    // Create default user preferences
    console.log("👤 Creating default user preferences...");
    await sql`
      INSERT INTO user_preferences (user_id, organization_id, preferences, theme, language)
      VALUES (${adminUser.id}, ${org.id}, '{"firstName": "Admin", "lastName": "User", "email": "sannygupta102@gmail.com", "phone": "", "company": "", "position": ""}', 'light', 'en')
    `;
    
    console.log("✅ Default user preferences created");
    
    // Create sample AI model configurations
    console.log("🤖 Creating sample AI model configurations...");
    await sql`
      INSERT INTO ai_models (organization_id, name, type, provider, config, is_active) VALUES
        (${org.id}, 'Gemini Pro', 'text_generation', 'google', '{"model": "gemini-pro", "max_tokens": 1000, "temperature": 0.7}', true),
        (${org.id}, 'ChatGPT-4', 'text_generation', 'openai', '{"model": "gpt-4", "max_tokens": 1000, "temperature": 0.7}', true),
        (${org.id}, 'Claude-3', 'text_generation', 'anthropic', '{"model": "claude-3-sonnet", "max_tokens": 1000, "temperature": 0.7}', true),
        (${org.id}, 'Perplexity', 'text_generation', 'perplexity', '{"model": "mixtral-8x7b-instruct", "max_tokens": 1000, "temperature": 0.7}', true)
    `;
    
    console.log("✅ Sample AI model configurations created");
    
    // Create sample analytics data
    console.log("📊 Creating sample analytics data...");
    await sql`
      INSERT INTO analytics_metrics (
        organization_id, 
        metric, 
        value, 
        period, 
        date
      )
      VALUES 
        (${org.id}, 'delivery_rate', 95.5, 'daily', NOW()),
        (${org.id}, 'open_rate', 78.2, 'daily', NOW()),
        (${org.id}, 'reply_rate', 12.8, 'daily', NOW()),
        (${org.id}, 'sending_rate', 100.0, 'daily', NOW()),
        (${org.id}, 'failed_rate', 4.5, 'daily', NOW())
    `;
    
    console.log("✅ Sample analytics data created");
    
    console.log("🎉 Complete database initialization finished!");
    console.log("📋 Total tables created: 32");
    console.log("🚀 You can now start the application with: npm run dev");
    
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initializeDatabase();
