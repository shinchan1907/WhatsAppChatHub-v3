import { Router } from "express";
import { neon } from "@neondatabase/serverless";
import { conversations, messages, contacts, messageTemplates } from "../../shared/schema";
import { z } from "zod";

const router = Router();

// Validation schemas
const createConversationSchema = z.object({
  contactId: z.string().uuid("Invalid contact ID"),
  templateId: z.string().uuid("Template ID is required for new conversations").optional(),
  templateVariables: z.record(z.any()).default({}),
});

const sendMessageSchema = z.object({
  content: z.string().optional(),
  type: z.enum(["text", "image", "video", "audio", "document", "location", "contact", "sticker", "template"]),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.any()).default({}),
  replyTo: z.string().uuid().optional(),
});

// Get all conversations for an organization
router.get("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const conversationsList = await sql`
      SELECT 
        c.id, c.contact_id, c.status, c.priority, c.assigned_to, c.tags, 
        c.last_message_at, c.last_message_id, c.unread_count, c.created_at, c.updated_at,
        co.name as contact_name, co.phone as contact_phone, co.avatar as contact_avatar
      FROM conversations c
      JOIN contacts co ON c.contact_id = co.id
      WHERE c.organization_id = ${organizationId}
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    `;

    res.json({
      success: true,
      data: conversationsList
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get conversation by ID
router.get("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const conversationsList = await sql`
      SELECT 
        c.id, c.contact_id, c.status, c.priority, c.assigned_to, c.tags, 
        c.last_message_at, c.last_message_id, c.unread_count, c.created_at, c.updated_at,
        co.name as contact_name, co.phone as contact_phone, co.avatar as contact_avatar
      FROM conversations c
      JOIN contacts co ON c.contact_id = co.id
      WHERE c.id = ${id} AND c.organization_id = ${organizationId}
    `;

    if (conversationsList.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({
      success: true,
      data: conversationsList[0]
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// Start new conversation (Start New Chat)
router.post("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const userId = req.headers["x-user-id"] as string;
    const conversationData = req.body;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ error: "Organization ID and User ID required" });
    }

    // Validate input
    const validatedData = createConversationSchema.parse(conversationData);

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if contact exists and belongs to organization
    const contact = await sql`
      SELECT id, name, phone FROM contacts 
      WHERE id = ${validatedData.contactId} AND organization_id = ${organizationId}
    `;

    if (contact.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Check if conversation already exists with this contact
    const existingConversation = await sql`
      SELECT id FROM conversations 
      WHERE contact_id = ${validatedData.contactId} AND organization_id = ${organizationId}
    `;

    if (existingConversation.length > 0) {
      return res.status(409).json({ 
        error: "Conversation already exists with this contact",
        conversationId: existingConversation[0].id
      });
    }

    // Get WhatsApp account for the organization
    const whatsappAccount = await sql`
      SELECT id FROM whatsapp_accounts 
      WHERE organization_id = ${organizationId} AND status = 'active'
      LIMIT 1
    `;

    if (whatsappAccount.length === 0) {
      return res.status(400).json({ error: "No active WhatsApp account found" });
    }

    // Create new conversation
    const newConversation = await sql`
      INSERT INTO conversations (
        organization_id, contact_id, whatsapp_account_id, status, priority, assigned_to
      ) VALUES (
        ${organizationId}, ${validatedData.contactId}, ${whatsappAccount[0].id}, 
        'open', 'normal', ${userId}
      ) RETURNING id, contact_id, status, priority, assigned_to, created_at, updated_at
    `;

    // If template is provided, send template message
    if (validatedData.templateId) {
      // Verify template is approved
      const template = await sql`
        SELECT id, name, content, variables, media_url, media_type 
        FROM message_templates 
        WHERE id = ${validatedData.templateId} AND organization_id = ${organizationId} 
          AND status = 'approved' AND is_active = true
      `;

      if (template.length === 0) {
        return res.status(400).json({ error: "Template not found or not approved" });
      }

      // Send template message
      const templateMessage = await sql`
        INSERT INTO messages (
          organization_id, conversation_id, contact_id, whatsapp_account_id,
          type, content, template_id, template_variables, direction, status
        ) VALUES (
          ${organizationId}, ${newConversation[0].id}, ${validatedData.contactId}, 
          ${whatsappAccount[0].id}, 'template', ${template[0].content}, 
          ${validatedData.templateId}, ${JSON.stringify(validatedData.templateVariables)}, 
          'outbound', 'sent'
        ) RETURNING id, content, type, template_id, template_variables, direction, status, created_at
      `;

      // Update conversation with last message
      await sql`
        UPDATE conversations 
        SET last_message_at = NOW(), last_message_id = ${templateMessage[0].id}, unread_count = 0
        WHERE id = ${newConversation[0].id}
      `;

      res.status(201).json({
        success: true,
        data: {
          conversation: newConversation[0],
          message: templateMessage[0]
        },
        message: "New conversation started with template message"
      });
    } else {
      res.status(201).json({
        success: true,
        data: {
          conversation: newConversation[0]
        },
        message: "New conversation started successfully"
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    console.error("Error starting conversation:", error);
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// Get messages for a conversation
router.get("/:id/messages", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if conversation exists and belongs to organization
    const conversation = await sql`
      SELECT id FROM conversations 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (conversation.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Get messages
    const messagesList = await sql`
      SELECT 
        m.id, m.content, m.type, m.direction, m.status, m.media_url, m.media_type,
        m.template_id, m.template_variables, m.reply_to, m.is_read, m.read_at,
        m.delivered_at, m.sent_at, m.created_at,
        mt.name as template_name
      FROM messages m
      LEFT JOIN message_templates mt ON m.template_id = mt.id
      WHERE m.conversation_id = ${id} AND m.organization_id = ${organizationId}
      ORDER BY m.created_at ASC
    `;

    res.json({
      success: true,
      data: messagesList
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message in conversation
router.post("/:id/messages", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    const messageData = req.body;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ error: "Organization ID and User ID required" });
    }

    // Validate input
    const validatedData = sendMessageSchema.parse(messageData);

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if conversation exists and belongs to organization
    const conversation = await sql`
      SELECT id, contact_id, whatsapp_account_id FROM conversations 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (conversation.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // If sending template message, verify template is approved
    if (validatedData.type === 'template' && validatedData.templateId) {
      const template = await sql`
        SELECT id, name, content, variables, media_url, media_type 
        FROM message_templates 
        WHERE id = ${validatedData.templateId} AND organization_id = ${organizationId} 
          AND status = 'approved' AND is_active = true
      `;

      if (template.length === 0) {
        return res.status(400).json({ error: "Template not found or not approved" });
      }
    }

    // Create message
    const newMessage = await sql`
      INSERT INTO messages (
        organization_id, conversation_id, contact_id, whatsapp_account_id,
        type, content, media_url, media_type, template_id, template_variables, 
        direction, status, reply_to
      ) VALUES (
        ${organizationId}, ${id}, ${conversation[0].contact_id}, 
        ${conversation[0].whatsapp_account_id}, ${validatedData.type}, 
        ${validatedData.content || null}, ${validatedData.mediaUrl || null}, 
        ${validatedData.mediaType || null}, ${validatedData.templateId || null}, 
        ${JSON.stringify(validatedData.templateVariables)}, 'outbound', 'sent',
        ${validatedData.replyTo || null}
      ) RETURNING id, content, type, media_url, media_type, template_id, 
                 template_variables, direction, status, created_at
    `;

    // Update conversation with last message
    await sql`
      UPDATE conversations 
      SET last_message_at = NOW(), last_message_id = ${newMessage[0].id}, unread_count = 0
      WHERE id = ${id}
    `;

    res.status(201).json({
      success: true,
      data: newMessage[0],
      message: "Message sent successfully"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Mark conversation as read
router.post("/:id/mark-read", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if conversation exists and belongs to organization
    const conversation = await sql`
      SELECT id FROM conversations 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (conversation.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Mark all messages as read
    await sql`
      UPDATE messages 
      SET is_read = true, read_at = NOW()
      WHERE conversation_id = ${id} AND organization_id = ${organizationId} AND direction = 'inbound'
    `;

    // Update conversation unread count
    await sql`
      UPDATE conversations 
      SET unread_count = 0
      WHERE id = ${id}
    `;

    res.json({
      success: true,
      message: "Conversation marked as read"
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    res.status(500).json({ error: "Failed to mark conversation as read" });
  }
});

// Update conversation status
router.put("/:id/status", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    const { status, priority, assignedTo } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    if (!status && !priority && !assignedTo) {
      return res.status(400).json({ error: "At least one field to update is required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if conversation exists and belongs to organization
    const existing = await sql`
      SELECT id FROM conversations 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    
    if (status) {
      updateFields.push('status');
      updateValues.push(status);
    }
    if (priority) {
      updateFields.push('priority');
      updateValues.push(priority);
    }
    if (assignedTo) {
      updateFields.push('assigned_to');
      updateValues.push(assignedTo);
    }

    const updateQuery = `
      UPDATE conversations 
      SET ${updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ')}, updated_at = NOW()
      WHERE id = $${updateFields.length + 1} AND organization_id = $${updateFields.length + 2}
      RETURNING id, status, priority, assigned_to, updated_at
    `;

    const result = await sql.unsafe(updateQuery, [
      ...updateValues,
      id,
      organizationId
    ]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({
      success: true,
      data: result[0],
      message: "Conversation updated successfully"
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

// Get conversation statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    const stats = await sql`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conversations,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_conversations,
        COUNT(CASE WHEN unread_count > 0 THEN 1 END) as unread_conversations,
        AVG(unread_count) as avg_unread_count
      FROM conversations 
      WHERE organization_id = ${organizationId}
    `;

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error("Error fetching conversation stats:", error);
    res.status(500).json({ error: "Failed to fetch conversation stats" });
  }
});

export default router;
