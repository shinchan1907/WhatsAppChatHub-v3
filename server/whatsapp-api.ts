import type { AppConfig } from "@shared/schema";

export interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: "text" | "template";
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters?: Array<{ type: string; text: string }>;
    }>;
  };
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        text?: { body: string };
        type: string;
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

export class WhatsAppAPIService {
  private config: AppConfig;
  private baseUrl = "https://graph.facebook.com/v18.0";

  constructor(config: AppConfig) {
    this.config = config;
  }

  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config.whatsappAccessToken || !this.config.whatsappPhoneNumberId) {
      return { success: false, error: "WhatsApp credentials not configured" };
    }

    console.log("📡 Making WhatsApp API request to:", `${this.baseUrl}/${this.config.whatsappPhoneNumberId}/messages`);
    console.log("📤 Message payload:", JSON.stringify(message, null, 2));

    try {
      const response = await fetch(`${this.baseUrl}/${this.config.whatsappPhoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log("📨 WhatsApp API response:", JSON.stringify(result, null, 2));

      if (response.ok && result.messages?.[0]?.id) {
        console.log("✅ Message sent successfully with ID:", result.messages[0].id);
        return { success: true, messageId: result.messages[0].id };
      } else {
        console.log("❌ WhatsApp API error response:", result);
        return { 
          success: false, 
          error: result.error?.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      console.log("❌ Network error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Network error" 
      };
    }
  }

  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    variables: Record<string, string> = {},
    ctaUrl?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const components: Array<any> = [];

    // Add body parameters if variables exist
    if (Object.keys(variables).length > 0) {
      components.push({
        type: "body",
        parameters: Object.values(variables).map(value => ({
          type: "text",
          text: value
        }))
      });
    }

    // Add CTA URL if provided
    if (ctaUrl) {
      components.push({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{
          type: "text",
          text: ctaUrl
        }]
      });
    }

    const message: WhatsAppMessage = {
      messaging_product: "whatsapp",
      to: to.replace(/[^\d+]/g, ""), // Clean phone number
      type: "template",
      template: {
        name: templateName.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        language: { code: "en_US" },
        components: components.length > 0 ? components : undefined
      }
    };

    return this.sendMessage(message);
  }

  async sendTextMessage(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message: WhatsAppMessage = {
      messaging_product: "whatsapp",
      to: to.replace(/[^\d+]/g, ""), // Clean phone number
      type: "text",
      text: { body: text }
    };

    return this.sendMessage(message);
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<{ success: boolean; challenge?: string; error?: string }> {
    if (mode === "subscribe" && token === this.config.whatsappWebhookVerifyToken) {
      return { success: true, challenge };
    }
    return { success: false, error: "Invalid webhook verification" };
  }

  parseWebhookPayload(payload: any): {
    messages: Array<{
      from: string;
      messageId: string;
      text: string;
      timestamp: Date;
    }>;
    statuses: Array<{
      messageId: string;
      status: string;
      timestamp: Date;
      recipient: string;
    }>;
  } {
    const messages: Array<any> = [];
    const statuses: Array<any> = [];

    if (payload.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          // Process incoming messages
          if (change.value?.messages) {
            for (const msg of change.value.messages) {
              messages.push({
                from: msg.from,
                messageId: msg.id,
                text: msg.text?.body || "",
                timestamp: new Date(parseInt(msg.timestamp) * 1000)
              });
            }
          }

          // Process message statuses
          if (change.value?.statuses) {
            for (const status of change.value.statuses) {
              statuses.push({
                messageId: status.id,
                status: status.status,
                timestamp: new Date(parseInt(status.timestamp) * 1000),
                recipient: status.recipient_id
              });
            }
          }
        }
      }
    }

    return { messages, statuses };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.whatsappAccessToken || !this.config.whatsappPhoneNumberId) {
      return { success: false, error: "WhatsApp credentials not configured" };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.config.whatsappPhoneNumberId}`, {
        headers: {
          "Authorization": `Bearer ${this.config.whatsappAccessToken}`,
        },
      });

      if (response.ok) {
        return { success: true };
      } else {
        const result = await response.json();
        return { 
          success: false, 
          error: result.error?.message || "WhatsApp API connection failed" 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Network error" 
      };
    }
  }

  async syncTemplatesFromFBM(): Promise<{ success: boolean; templates?: any[]; error?: string }> {
    try {
      if (!this.config.whatsappAccessToken) {
        return { success: false, error: "WhatsApp access token is required" };
      }

      console.log("📋 Starting template sync from Facebook Business Manager...");

      // Get WhatsApp Business Account ID from phone number ID
      const phoneResponse = await fetch(`https://graph.facebook.com/v21.0/${this.config.whatsappPhoneNumberId}`, {
        headers: {
          "Authorization": `Bearer ${this.config.whatsappAccessToken}`,
        },
      });

      const phoneData = await phoneResponse.json();
      
      if (!phoneResponse.ok) {
        console.error("❌ Failed to get phone info:", phoneData);
        return { success: false, error: "Failed to get phone number information" };
      }

      const waBaId = phoneData.whatsapp_business_account_id;
      console.log("📋 WhatsApp Business Account ID:", waBaId);

      // Fetch message templates from Facebook Business Manager
      const templatesResponse = await fetch(`https://graph.facebook.com/v21.0/${waBaId}/message_templates?limit=100`, {
        headers: {
          "Authorization": `Bearer ${this.config.whatsappAccessToken}`,
        },
      });

      const templatesData = await templatesResponse.json();

      if (!templatesResponse.ok) {
        console.error("❌ Failed to fetch templates:", templatesData);
        return { success: false, error: templatesData.error?.message || "Failed to fetch templates" };
      }

      const approvedTemplates = templatesData.data?.filter((template: any) => template.status === "APPROVED") || [];
      
      console.log(`📋 Found ${approvedTemplates.length} approved templates from Facebook Business Manager`);
      
      return { success: true, templates: approvedTemplates };
    } catch (error) {
      console.error("❌ Template sync failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}