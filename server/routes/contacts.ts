import { Router } from "express";
import { neon } from "@neondatabase/serverless";
import { contacts, contactGroups, contactGroupMembers } from "../../shared/schema";
import { z } from "zod";

const router = Router();

// Validation schemas
const createContactSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  language: z.string().default("en"),
  timezone: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.any()).default({}),
});

const updateContactSchema = createContactSchema.partial();

// Get all contacts for an organization
router.get("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const contactsList = await sql`
      SELECT id, phone, name, email, avatar, language, timezone, tags, 
             custom_fields, is_active, last_contact, created_at, updated_at
      FROM contacts 
      WHERE organization_id = ${organizationId}
      ORDER BY name ASC, created_at DESC
    `;

    res.json({
      success: true,
      data: contactsList
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Get contact by ID
router.get("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const contactsList = await sql`
      SELECT id, phone, name, email, avatar, language, timezone, tags, 
             custom_fields, is_active, last_contact, created_at, updated_at
      FROM contacts 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (contactsList.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json({
      success: true,
      data: contactsList[0]
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

// Create new contact
router.post("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const contactData = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    // Validate input
    const validatedData = createContactSchema.parse(contactData);

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if contact with same phone already exists
    const existing = await sql`
      SELECT id FROM contacts 
      WHERE phone = ${validatedData.phone} AND organization_id = ${organizationId}
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: "Contact with this phone number already exists" });
    }

    const newContact = await sql`
      INSERT INTO contacts (
        organization_id, phone, name, email, language, timezone, tags, custom_fields
      ) VALUES (
        ${organizationId}, ${validatedData.phone}, ${validatedData.name || null}, 
        ${validatedData.email || null}, ${validatedData.language}, 
        ${validatedData.timezone || null}, ${JSON.stringify(validatedData.tags)}, 
        ${JSON.stringify(validatedData.customFields)}
      ) RETURNING id, phone, name, email, language, timezone, tags, custom_fields, 
                 is_active, created_at, updated_at
    `;

    res.status(201).json({
      success: true,
      data: newContact[0],
      message: "Contact created successfully"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    console.error("Error creating contact:", error);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// Update contact
router.put("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    const contactData = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    // Validate input
    const validatedData = updateContactSchema.parse(contactData);

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if contact exists and belongs to organization
    const existing = await sql`
      SELECT id FROM contacts 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Check if phone number is being changed and if it conflicts with existing contact
    if (validatedData.phone) {
      const phoneConflict = await sql`
        SELECT id FROM contacts 
        WHERE phone = ${validatedData.phone} AND organization_id = ${organizationId} AND id != ${id}
      `;

      if (phoneConflict.length > 0) {
        return res.status(409).json({ error: "Another contact with this phone number already exists" });
      }
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

    // Build dynamic update query
    const updateQuery = `
      UPDATE contacts 
      SET ${updateFields.map((field, index) => {
        if (field === 'tags' || field === 'customFields') {
          return `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 1}`;
        }
        return `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 1}`;
      }).join(', ')}, updated_at = NOW()
      WHERE id = $${updateFields.length + 1} AND organization_id = $${updateFields.length + 2}
      RETURNING id, phone, name, email, language, timezone, tags, custom_fields, 
                is_active, last_contact, updated_at
    `;

    const result = await sql.unsafe(updateQuery, [
      ...updateValues.map(value => 
        typeof value === 'object' ? JSON.stringify(value) : value
      ),
      id,
      organizationId
    ]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json({
      success: true,
      data: result[0],
      message: "Contact updated successfully"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

// Delete contact
router.delete("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if contact exists and belongs to organization
    const existing = await sql`
      SELECT id FROM contacts 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Delete contact
    await sql`
      DELETE FROM contacts 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    res.json({
      success: true,
      message: "Contact deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

// Search contacts
router.get("/search/:query", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { query } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const searchResults = await sql`
      SELECT id, phone, name, email, avatar, language, timezone, tags, 
             custom_fields, is_active, last_contact, created_at, updated_at
      FROM contacts 
      WHERE organization_id = ${organizationId} 
        AND (
          phone ILIKE ${`%${query}%`} OR 
          name ILIKE ${`%${query}%`} OR 
          email ILIKE ${`%${query}%`}
        )
      ORDER BY 
        CASE 
          WHEN phone ILIKE ${`${query}%`} THEN 1
          WHEN name ILIKE ${`${query}%`} THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT 20
    `;

    res.json({
      success: true,
      data: searchResults
    });
  } catch (error) {
    console.error("Error searching contacts:", error);
    res.status(500).json({ error: "Failed to search contacts" });
  }
});

// Get contact groups
router.get("/groups", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const groups = await sql`
      SELECT id, name, description, color, is_system, created_at, updated_at
      FROM contact_groups 
      WHERE organization_id = ${organizationId}
      ORDER BY name ASC
    `;

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error("Error fetching contact groups:", error);
    res.status(500).json({ error: "Failed to fetch contact groups" });
  }
});

// Create contact group
router.post("/groups", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { name, description, color } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    if (!name) {
      return res.status(400).json({ error: "Group name is required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if group with same name already exists
    const existing = await sql`
      SELECT id FROM contact_groups 
      WHERE name = ${name} AND organization_id = ${organizationId}
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: "Group with this name already exists" });
    }

    const newGroup = await sql`
      INSERT INTO contact_groups (
        organization_id, name, description, color
      ) VALUES (
        ${organizationId}, ${name}, ${description || null}, ${color || "#3B82F6"}
      ) RETURNING id, name, description, color, is_system, created_at, updated_at
    `;

    res.status(201).json({
      success: true,
      data: newGroup[0],
      message: "Contact group created successfully"
    });
  } catch (error) {
    console.error("Error creating contact group:", error);
    res.status(500).json({ error: "Failed to create contact group" });
  }
});

// Add contact to group
router.post("/groups/:groupId/contacts/:contactId", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { groupId, contactId } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if group and contact exist and belong to organization
    const group = await sql`
      SELECT id FROM contact_groups 
      WHERE id = ${groupId} AND organization_id = ${organizationId}
    `;

    if (group.length === 0) {
      return res.status(404).json({ error: "Contact group not found" });
    }

    const contact = await sql`
      SELECT id FROM contacts 
      WHERE id = ${contactId} AND organization_id = ${organizationId}
    `;

    if (contact.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Check if contact is already in group
    const existing = await sql`
      SELECT id FROM contact_group_members 
      WHERE group_id = ${groupId} AND contact_id = ${contactId}
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: "Contact is already in this group" });
    }

    // Add contact to group
    await sql`
      INSERT INTO contact_group_members (group_id, contact_id)
      VALUES (${groupId}, ${contactId})
    `;

    res.json({
      success: true,
      message: "Contact added to group successfully"
    });
  } catch (error) {
    console.error("Error adding contact to group:", error);
    res.status(500).json({ error: "Failed to add contact to group" });
  }
});

// Remove contact from group
router.delete("/groups/:groupId/contacts/:contactId", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { groupId, contactId } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if group and contact exist and belong to organization
    const group = await sql`
      SELECT id FROM contact_groups 
      WHERE id = ${groupId} AND organization_id = ${organizationId}
    `;

    if (group.length === 0) {
      return res.status(404).json({ error: "Contact group not found" });
    }

    const contact = await sql`
      SELECT id FROM contacts 
      WHERE id = ${contactId} AND organization_id = ${organizationId}
    `;

    if (contact.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Remove contact from group
    await sql`
      DELETE FROM contact_group_members 
      WHERE group_id = ${groupId} AND contact_id = ${contactId}
    `;

    res.json({
      success: true,
      message: "Contact removed from group successfully"
    });
  } catch (error) {
    console.error("Error removing contact from group:", error);
    res.status(500).json({ error: "Failed to remove contact from group" });
  }
});

export default router;
