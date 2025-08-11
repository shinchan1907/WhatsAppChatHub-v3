import { Router } from "express";
import { neon } from "@neondatabase/serverless";
import { messageTemplates, mediaFiles } from "../../shared/schema";
import { z } from "zod";

const router = Router();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.string().default("general"),
  language: z.string().default("en"),
  content: z.string().min(1, "Template content is required"),
  variables: z.array(z.string()).default([]),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

// Get all templates for an organization
router.get("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const templates = await sql`
      SELECT id, name, category, language, content, variables, media_url, media_type, 
             status, rejection_reason, is_active, created_at, updated_at
      FROM message_templates 
      WHERE organization_id = ${organizationId}
      ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Get template by ID
router.get("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const templates = await sql`
      SELECT id, name, category, language, content, variables, media_url, media_type, 
             status, rejection_reason, is_active, created_at, updated_at
      FROM message_templates 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (templates.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({
      success: true,
      data: templates[0]
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// Create new template
router.post("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const templateData = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    // Validate input
    const validatedData = createTemplateSchema.parse(templateData);

    const sql = neon(process.env.DATABASE_URL!);
    
    const newTemplate = await sql`
      INSERT INTO message_templates (
        organization_id, name, category, language, content, variables, 
        media_url, media_type, status
      ) VALUES (
        ${organizationId}, ${validatedData.name}, ${validatedData.category}, 
        ${validatedData.language}, ${validatedData.content}, ${JSON.stringify(validatedData.variables)},
        ${validatedData.mediaUrl || null}, ${validatedData.mediaType || null}, 'pending'
      ) RETURNING id, name, category, language, content, variables, media_url, media_type, 
                 status, created_at, updated_at
    `;

    res.status(201).json({
      success: true,
      data: newTemplate[0],
      message: "Template created successfully. Awaiting approval."
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    console.error("Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// Sync templates from WhatsApp Business Manager
router.post("/sync", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { phoneNumberId, businessAccountId, accessToken } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    if (!phoneNumberId || !businessAccountId || !accessToken) {
      return res.status(400).json({ error: "Phone Number ID, Business Account ID, and Access Token are required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    try {
      // Fetch templates from WhatsApp Business API
      const whatsappResponse = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/message_templates?access_token=${accessToken}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!whatsappResponse.ok) {
        throw new Error(`WhatsApp API error: ${whatsappResponse.status} ${whatsappResponse.statusText}`);
      }

      const whatsappData = await whatsappResponse.json();
      
      if (!whatsappData.data || !Array.isArray(whatsappData.data)) {
        throw new Error("Invalid response from WhatsApp API");
      }

      let syncedCount = 0;
      let updatedCount = 0;

      // Process each template
      for (const template of whatsappData.data) {
        if (template.status === 'APPROVED') {
          // Check if template already exists
          const existing = await sql`
            SELECT id FROM message_templates 
            WHERE organization_id = ${organizationId} AND whatsapp_template_id = ${template.id}
          `;

          const templateData = {
            name: template.name,
            category: template.category || 'general',
            language: template.language || 'en',
            content: template.components?.find(c => c.type === 'BODY')?.text || '',
            variables: template.components?.find(c => c.type === 'BODY')?.text?.match(/\{\{(\d+)\}\}/g)?.map(v => v.replace(/\{\{(\d+)\}\}/, '$1')) || [],
            status: 'approved',
            whatsapp_template_id: template.id,
            is_active: true
          };

          if (existing.length > 0) {
            // Update existing template
            await sql`
              UPDATE message_templates 
              SET name = ${templateData.name}, category = ${templateData.category}, 
                  language = ${templateData.language}, content = ${templateData.content},
                  variables = ${JSON.stringify(templateData.variables)}, status = ${templateData.status},
                  updated_at = NOW()
              WHERE id = ${existing[0].id}
            `;
            updatedCount++;
          } else {
            // Insert new template
            await sql`
              INSERT INTO message_templates (
                organization_id, name, category, language, content, variables, 
                status, whatsapp_template_id, is_active
              ) VALUES (
                ${organizationId}, ${templateData.name}, ${templateData.category}, 
                ${templateData.language}, ${templateData.content}, ${JSON.stringify(templateData.variables)},
                ${templateData.status}, ${templateData.whatsapp_template_id}, ${templateData.is_active}
              )
            `;
            syncedCount++;
          }
        }
      }

      res.json({
        success: true,
        data: {
          count: syncedCount + updatedCount,
          synced: syncedCount,
          updated: updatedCount,
          total: whatsappData.data.length
        },
        message: `Successfully synced ${syncedCount} new templates and updated ${updatedCount} existing templates`
      });
    } catch (whatsappError) {
      console.error("WhatsApp API error:", whatsappError);
      throw new Error(`Failed to sync templates from WhatsApp: ${whatsappError.message}`);
    }
  } catch (error) {
    console.error("Error syncing templates:", error);
    res.status(500).json({ 
      error: "Failed to sync templates",
      message: error.message 
    });
  }
});

// Update template
router.put("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    const templateData = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    // Validate input
    const validatedData = updateTemplateSchema.parse(templateData);

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if template exists and belongs to organization
    const existing = await sql`
      SELECT id FROM message_templates 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(key);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Reset status to pending when template is modified
    const updateQuery = `
      UPDATE message_templates 
      SET ${updateFields.map((field, index) => {
        if (field === 'variables') {
          return `${field} = $${index + 1}`;
        }
        return `${field} = $${index + 1}`;
      }).join(', ')}, status = 'pending', updated_at = NOW()
      WHERE id = $${updateFields.length + 1} AND organization_id = $${updateFields.length + 2}
      RETURNING id, name, category, language, content, variables, media_url, media_type, 
                status, updated_at
    `;

    const result = await sql.unsafe(updateQuery, [
      ...updateValues.map(value => 
        typeof value === 'object' ? JSON.stringify(value) : value
      ),
      id,
      organizationId
    ]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({
      success: true,
      data: result[0],
      message: "Template updated successfully. Status reset to pending for approval."
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    console.error("Error updating template:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
});

// Delete template
router.delete("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if template exists and belongs to organization
    const existing = await sql`
      SELECT id FROM message_templates 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Delete template
    await sql`
      DELETE FROM message_templates 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    res.json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

// Approve template (admin only)
router.post("/:id/approve", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if template exists and belongs to organization
    const existing = await sql`
      SELECT id, status FROM message_templates 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (existing[0].status === 'approved') {
      return res.status(400).json({ error: "Template is already approved" });
    }

    // Approve template
    const result = await sql`
      UPDATE message_templates 
      SET status = 'approved', updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${organizationId}
      RETURNING id, name, status, updated_at
    `;

    res.json({
      success: true,
      data: result[0],
      message: "Template approved successfully"
    });
  } catch (error) {
    console.error("Error approving template:", error);
    res.status(500).json({ error: "Failed to approve template" });
  }
});

// Reject template (admin only)
router.post("/:id/reject", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    if (!reason) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if template exists and belongs to organization
    const existing = await sql`
      SELECT id, status FROM message_templates 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (existing[0].status === 'rejected') {
      return res.status(400).json({ error: "Template is already rejected" });
    }

    // Reject template
    const result = await sql`
      UPDATE message_templates 
      SET status = 'rejected', rejection_reason = ${reason}, updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${organizationId}
      RETURNING id, name, status, rejection_reason, updated_at
    `;

    res.json({
      success: true,
      data: result[0],
      message: "Template rejected successfully"
    });
  } catch (error) {
    console.error("Error rejecting template:", error);
    res.status(500).json({ error: "Failed to reject template" });
  }
});

// Get approved templates only (for sending messages)
router.get("/approved/list", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const templates = await sql`
      SELECT id, name, category, language, content, variables, media_url, media_type
      FROM message_templates 
      WHERE organization_id = ${organizationId} AND status = 'approved' AND is_active = true
      ORDER BY name
    `;

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("Error fetching approved templates:", error);
    res.status(500).json({ error: "Failed to fetch approved templates" });
  }
});

// Upload media for template
router.post("/:id/media", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    const { mediaUrl, mediaType, filename, originalName, size } = req.body;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ error: "Organization ID and User ID required" });
    }

    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ error: "Media URL and type are required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if template exists and belongs to organization
    const existing = await sql`
      SELECT id FROM message_templates 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Save media file record
    const mediaFile = await sql`
      INSERT INTO media_files (
        organization_id, filename, original_name, mime_type, size, url, uploaded_by
      ) VALUES (
        ${organizationId}, ${filename || 'template-media'}, ${originalName || 'template-media'}, 
        ${mediaType}, ${size || 0}, ${mediaUrl}, ${userId}
      ) RETURNING id, url, mime_type
    `;

    // Update template with media
    const updatedTemplate = await sql`
      UPDATE message_templates 
      SET media_url = ${mediaUrl}, media_type = ${mediaType}, updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${organizationId}
      RETURNING id, name, media_url, media_type, updated_at
    `;

    res.json({
      success: true,
      data: {
        template: updatedTemplate[0],
        mediaFile: mediaFile[0]
      },
      message: "Media uploaded successfully"
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    res.status(500).json({ error: "Failed to upload media" });
  }
});

export default router;
