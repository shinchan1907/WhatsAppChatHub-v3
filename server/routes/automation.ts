import { Router } from "express";
import { neon } from "@neondatabase/serverless";
import { automationFlows, automationExecutions } from "../../shared/schema";
import { z } from "zod";

const router = Router();

// Validation schemas
const createAutomationFlowSchema = z.object({
  name: z.string().min(1, "Automation name is required"),
  description: z.string().optional(),
  trigger: z.enum(["message_received", "contact_created", "time_based", "webhook"]),
  triggerConfig: z.record(z.any()),
  nodes: z.array(z.record(z.any())),
  edges: z.array(z.record(z.any())),
  isActive: z.boolean().default(true),
});

const updateAutomationFlowSchema = createAutomationFlowSchema.partial();

// Get all automation flows for an organization
router.get("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const flows = await sql`
      SELECT id, name, description, trigger, trigger_config, nodes, edges, 
             is_active, created_at, updated_at
      FROM automation_flows 
      WHERE organization_id = ${organizationId}
      ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      data: flows
    });
  } catch (error) {
    console.error("Error fetching automation flows:", error);
    res.status(500).json({ error: "Failed to fetch automation flows" });
  }
});

// Get automation flow by ID
router.get("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const flows = await sql`
      SELECT id, name, description, trigger, trigger_config, nodes, edges, 
             is_active, created_at, updated_at
      FROM automation_flows 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (flows.length === 0) {
      return res.status(404).json({ error: "Automation flow not found" });
    }

    res.json({
      success: true,
      data: flows[0]
    });
  } catch (error) {
    console.error("Error fetching automation flow:", error);
    res.status(500).json({ error: "Failed to fetch automation flow" });
  }
});

// Create new automation flow
router.post("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const flowData = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    // Validate input
    const validatedData = createAutomationFlowSchema.parse(flowData);

    const sql = neon(process.env.DATABASE_URL!);
    
    const newFlow = await sql`
      INSERT INTO automation_flows (
        organization_id, name, description, trigger, trigger_config, nodes, edges, is_active
      ) VALUES (
        ${organizationId}, ${validatedData.name}, ${validatedData.description || null}, 
        ${validatedData.trigger}, ${JSON.stringify(validatedData.triggerConfig)}, 
        ${JSON.stringify(validatedData.nodes)}, ${JSON.stringify(validatedData.edges)}, 
        ${validatedData.isActive}
      ) RETURNING id, name, description, trigger, trigger_config, nodes, edges, 
                 is_active, created_at, updated_at
    `;

    res.status(201).json({
      success: true,
      data: newFlow[0],
      message: "Automation flow created successfully"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    console.error("Error creating automation flow:", error);
    res.status(500).json({ error: "Failed to create automation flow" });
  }
});

// Update automation flow
router.put("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    const flowData = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    // Validate input
    const validatedData = updateAutomationFlowSchema.parse(flowData);

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if flow exists and belongs to organization
    const existing = await sql`
      SELECT id FROM automation_flows 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Automation flow not found" });
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
      UPDATE automation_flows 
      SET ${updateFields.map((field, index) => {
        if (field === 'triggerConfig' || field === 'nodes' || field === 'edges') {
          return `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 1}`;
        }
        return `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 1}`;
      }).join(', ')}, updated_at = NOW()
      WHERE id = $${updateFields.length + 1} AND organization_id = $${updateFields.length + 2}
      RETURNING id, name, description, trigger, trigger_config, nodes, edges, 
                is_active, updated_at
    `;

    const result = await sql.unsafe(updateQuery, [
      ...updateValues.map(value => 
        typeof value === 'object' ? JSON.stringify(value) : value
      ),
      id,
      organizationId
    ]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Automation flow not found" });
    }

    res.json({
      success: true,
      data: result[0],
      message: "Automation flow updated successfully"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation error", 
        details: error.errors 
      });
    }
    
    console.error("Error updating automation flow:", error);
    res.status(500).json({ error: "Failed to update automation flow" });
  }
});

// Delete automation flow
router.delete("/:id", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if flow exists and belongs to organization
    const existing = await sql`
      SELECT id FROM automation_flows 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Automation flow not found" });
    }

    // Delete flow
    await sql`
      DELETE FROM automation_flows 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    res.json({
      success: true,
      message: "Automation flow deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting automation flow:", error);
    res.status(500).json({ error: "Failed to delete automation flow" });
  }
});

// Toggle automation flow active status
router.post("/:id/toggle", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if flow exists and belongs to organization
    const existing = await sql`
      SELECT id, is_active FROM automation_flows 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Automation flow not found" });
    }

    // Toggle status
    const newStatus = !existing[0].is_active;
    const result = await sql`
      UPDATE automation_flows 
      SET is_active = ${newStatus}, updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${organizationId}
      RETURNING id, name, is_active, updated_at
    `;

    res.json({
      success: true,
      data: result[0],
      message: `Automation flow ${newStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Error toggling automation flow:", error);
    res.status(500).json({ error: "Failed to toggle automation flow" });
  }
});

// Get automation executions for a flow
router.get("/:id/executions", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if flow exists and belongs to organization
    const existing = await sql`
      SELECT id FROM automation_flows 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Automation flow not found" });
    }

    // Get executions
    const executions = await sql`
      SELECT id, contact_id, status, current_node, execution_path, variables,
             started_at, completed_at, error_message, created_at
      FROM automation_executions 
      WHERE flow_id = ${id} AND organization_id = ${organizationId}
      ORDER BY started_at DESC
      LIMIT 100
    `;

    res.json({
      success: true,
      data: executions
    });
  } catch (error) {
    console.error("Error fetching automation executions:", error);
    res.status(500).json({ error: "Failed to fetch automation executions" });
  }
});

// Get automation statistics
router.get("/:id/stats", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if flow exists and belongs to organization
    const existing = await sql`
      SELECT id FROM automation_flows 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: "Automation flow not found" });
    }

    // Get statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
      FROM automation_executions 
      WHERE flow_id = ${id} AND organization_id = ${organizationId}
    `;

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error("Error fetching automation stats:", error);
    res.status(500).json({ error: "Failed to fetch automation stats" });
  }
});

// Duplicate automation flow
router.post("/:id/duplicate", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { id } = req.params;
    const { name } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    if (!name) {
      return res.status(400).json({ error: "New name is required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if original flow exists and belongs to organization
    const original = await sql`
      SELECT name, description, trigger, trigger_config, nodes, edges
      FROM automation_flows 
      WHERE id = ${id} AND organization_id = ${organizationId}
    `;

    if (original.length === 0) {
      return res.status(404).json({ error: "Automation flow not found" });
    }

    // Create duplicate
    const duplicated = await sql`
      INSERT INTO automation_flows (
        organization_id, name, description, trigger, trigger_config, nodes, edges, is_active
      ) VALUES (
        ${organizationId}, ${name}, ${original[0].description}, 
        ${original[0].trigger}, ${original[0].trigger_config}, 
        ${original[0].nodes}, ${original[0].edges}, false
      ) RETURNING id, name, description, trigger, trigger_config, nodes, edges, 
                 is_active, created_at, updated_at
    `;

    res.status(201).json({
      success: true,
      data: duplicated[0],
      message: "Automation flow duplicated successfully"
    });
  } catch (error) {
    console.error("Error duplicating automation flow:", error);
    res.status(500).json({ error: "Failed to duplicate automation flow" });
  }
});

export default router;
