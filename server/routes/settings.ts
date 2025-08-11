import { Router } from "express";
import { neon } from "@neondatabase/serverless";
import { applicationSettings, userPreferences } from "../../shared/schema";

const router = Router();

// Get all settings for an organization
router.get("/", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const settings = await sql`
      SELECT key, value, category, description, is_encrypted, updated_at
      FROM application_settings 
      WHERE organization_id = ${organizationId}
      ORDER BY category, key
    `;

    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    res.json({
      success: true,
      data: groupedSettings
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Get settings by category
router.get("/:category", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { category } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const settings = await sql`
      SELECT key, value, description, is_encrypted, updated_at
      FROM application_settings 
      WHERE organization_id = ${organizationId} AND category = ${category}
      ORDER BY key
    `;

    const categorySettings = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    res.json({
      success: true,
      data: categorySettings
    });
  } catch (error) {
    console.error("Error fetching category settings:", error);
    res.status(500).json({ error: "Failed to fetch category settings" });
  }
});

// Save settings for a category
router.post("/:category", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { category } = req.params;
    const settings = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Begin transaction
    await sql`BEGIN`;
    
    try {
      for (const [key, value] of Object.entries(settings)) {
        // Check if setting exists
        const existing = await sql`
          SELECT id FROM application_settings 
          WHERE organization_id = ${organizationId} AND category = ${category} AND key = ${key}
        `;

        if (existing.length > 0) {
          // Update existing setting
          await sql`
            UPDATE application_settings 
            SET value = ${JSON.stringify(value)}, updated_at = NOW()
            WHERE organization_id = ${organizationId} AND category = ${category} AND key = ${key}
          `;
        } else {
          // Insert new setting
          await sql`
            INSERT INTO application_settings (organization_id, category, key, value, description)
            VALUES (${organizationId}, ${category}, ${key}, ${JSON.stringify(value)}, ${`${category} setting for ${key}`})
          `;
        }
      }
      
      await sql`COMMIT`;
      
      res.json({
        success: true,
        message: `${category} settings saved successfully`
      });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// Save WhatsApp API settings
router.post("/whatsapp", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const {
      phoneNumber,
      phoneNumberId,
      businessAccountId,
      accessToken,
      webhookVerifyToken,
      webhookUrl
    } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    const settings = {
      phoneNumber,
      phoneNumberId,
      businessAccountId,
      accessToken,
      webhookVerifyToken,
      webhookUrl
    };

    // Save each setting
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && value !== null) {
        const existing = await sql`
          SELECT id FROM application_settings 
          WHERE organization_id = ${organizationId} AND category = 'whatsapp' AND key = ${key}
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE application_settings 
            SET value = ${JSON.stringify(value)}, updated_at = NOW()
            WHERE organization_id = ${organizationId} AND category = 'whatsapp' AND key = ${key}
          `;
        } else {
          await sql`
            INSERT INTO application_settings (organization_id, category, key, value, description)
            VALUES (${organizationId}, 'whatsapp', ${key}, ${JSON.stringify(value)}, ${`WhatsApp ${key}`})
          `;
        }
      }
    }
    
    res.json({
      success: true,
      message: "WhatsApp settings saved successfully"
    });
  } catch (error) {
    console.error("Error saving WhatsApp settings:", error);
    res.status(500).json({ error: "Failed to save WhatsApp settings" });
  }
});

// Test WhatsApp API connection
router.post("/whatsapp/test", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const { phoneNumber, phoneNumberId, businessAccountId, accessToken } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ error: "Phone Number ID and Access Token are required" });
    }

    try {
      // Test WhatsApp Business API connection by fetching account info
      // Use the current endpoint for WhatsApp Business API with valid fields
      
      // Debug logging
      console.log('🔍 Testing WhatsApp API with:');
      console.log('  Phone Number ID:', phoneNumberId);
      console.log('  Access Token length:', accessToken?.length);
      console.log('  Access Token preview:', accessToken?.substring(0, 20) + '...');
      
      const apiUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=id,display_phone_number,verified_name&access_token=${accessToken}`;
      console.log('  API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`WhatsApp API Response Status: ${response.status}`);
      console.log(`WhatsApp API Response Headers:`, response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`WhatsApp API Error Response:`, errorText);
        console.log(`WhatsApp API Error Status:`, response.status);
        console.log(`WhatsApp API Error Headers:`, Object.fromEntries(response.headers.entries()));
        
        // Try alternative test - check if we can access the messages endpoint
        console.log('Trying alternative WhatsApp API test...');
        const altResponse = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages?access_token=${accessToken}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (altResponse.ok) {
          console.log('Alternative test successful - messages endpoint accessible');
          res.json({
            success: true,
            data: {
              phoneNumberId: phoneNumberId,
              status: 'connected',
              message: 'WhatsApp API connection test successful (messages endpoint accessible)'
            },
            message: "WhatsApp API connection test successful"
          });
          return;
        }
        
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`WhatsApp API Success Response:`, data);
      
      if (data.error) {
        throw new Error(`WhatsApp API error: ${data.error.message}`);
      }

      res.json({
        success: true,
        data: {
          phoneNumberId: data.id,
          phoneNumber: data.display_phone_number,
          verifiedName: data.verified_name
        },
        message: "WhatsApp API connection test successful"
      });
    } catch (whatsappError: any) {
      console.error("WhatsApp API test error:", whatsappError);
      throw new Error(`WhatsApp API test failed: ${whatsappError.message}`);
    }
  } catch (error: any) {
    console.error("Error testing WhatsApp API:", error);
    res.status(500).json({ 
      error: "Failed to test WhatsApp API",
      message: error.message 
    });
  }
});

// Save CDN settings
router.post("/cdn", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const {
      provider,
      apiKey,
      zoneName,
      pullZoneUrl,
      storageZone,
      region
    } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    const settings = {
      provider,
      apiKey,
      zoneName,
      pullZoneUrl,
      storageZone,
      region
    };

    // Save each setting
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && value !== null) {
        const existing = await sql`
          SELECT id FROM application_settings 
          WHERE organization_id = ${organizationId} AND category = 'cdn' AND key = ${key}
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE application_settings 
            SET value = ${JSON.stringify(value)}, updated_at = NOW()
            WHERE organization_id = ${organizationId} AND category = 'cdn' AND key = ${key}
          `;
        } else {
          await sql`
            INSERT INTO application_settings (organization_id, category, key, value, description, is_encrypted)
            VALUES (${organizationId}, 'cdn', ${key}, ${JSON.stringify(value)}, ${`CDN ${key}`}, ${key === 'apiKey'})
          `;
        }
      }
    }
    
    res.json({
      success: true,
      message: "CDN settings saved successfully"
    });
  } catch (error) {
    console.error("Error saving CDN settings:", error);
    res.status(500).json({ error: "Failed to save CDN settings" });
  }
});

// Save notification settings
router.post("/notifications", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const notificationSettings = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Save notification settings
    for (const [key, value] of Object.entries(notificationSettings)) {
      if (value !== undefined && value !== null) {
        const existing = await sql`
          SELECT id FROM application_settings 
          WHERE organization_id = ${organizationId} AND category = 'notifications' AND key = ${key}
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE application_settings 
            SET value = ${JSON.stringify(value)}, updated_at = NOW()
            WHERE organization_id = ${organizationId} AND category = 'notifications' AND key = ${key}
          `;
        } else {
          await sql`
            INSERT INTO application_settings (organization_id, category, key, value, description)
            VALUES (${organizationId}, 'notifications', ${key}, ${JSON.stringify(value)}, ${`Notification setting for ${key}`})
          `;
        }
      }
    }
    
    res.json({
      success: true,
      message: "Notification settings saved successfully"
    });
  } catch (error) {
    console.error("Error saving notification settings:", error);
    res.status(500).json({ error: "Failed to save notification settings" });
  }
});

// Save security settings
router.post("/security", async (req, res) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    const securitySettings = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Save security settings
    for (const [key, value] of Object.entries(securitySettings)) {
      if (value !== undefined && value !== null) {
        const existing = await sql`
          SELECT id FROM application_settings 
          WHERE organization_id = ${organizationId} AND category = 'security' AND key = ${key}
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE application_settings 
            SET value = ${JSON.stringify(value)}, updated_at = NOW()
            WHERE organization_id = ${organizationId} AND category = 'security' AND key = ${key}
          `;
        } else {
          await sql`
            INSERT INTO application_settings (organization_id, category, key, value, description)
            VALUES (${organizationId}, 'security', ${key}, ${JSON.stringify(value)}, ${`Security setting for ${key}`})
          `;
        }
      }
    }
    
    res.json({
      success: true,
      message: "Security settings saved successfully"
    });
  } catch (error) {
    console.error("Error saving security settings:", error);
    res.status(500).json({ error: "Failed to save security settings" });
  }
});

// Save user profile settings
router.post("/profile", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const organizationId = req.headers["x-organization-id"] as string;
    const profileSettings = req.body;
    
    if (!userId || !organizationId) {
      return res.status(400).json({ error: "User ID and Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Check if user preferences exist
    const existing = await sql`
      SELECT id FROM user_preferences 
      WHERE user_id = ${userId} AND organization_id = ${organizationId}
    `;

    if (existing.length > 0) {
      // Update existing preferences
      await sql`
        UPDATE user_preferences 
        SET preferences = ${JSON.stringify(profileSettings)}, updated_at = NOW()
        WHERE user_id = ${userId} AND organization_id = ${organizationId}
      `;
    } else {
      // Insert new preferences
      await sql`
        INSERT INTO user_preferences (user_id, organization_id, preferences)
        VALUES (${userId}, ${organizationId}, ${JSON.stringify(profileSettings)})
      `;
    }
    
    res.json({
      success: true,
      message: "Profile settings saved successfully"
    });
  } catch (error) {
    console.error("Error saving profile settings:", error);
    res.status(500).json({ error: "Failed to save profile settings" });
  }
});

// Get user preferences
router.get("/user/preferences", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const organizationId = req.headers["x-organization-id"] as string;
    
    if (!userId || !organizationId) {
      return res.status(400).json({ error: "User ID and Organization ID required" });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const preferences = await sql`
      SELECT preferences, theme, language, timezone, date_format, time_format
      FROM user_preferences 
      WHERE user_id = ${userId} AND organization_id = ${organizationId}
    `;

    if (preferences.length === 0) {
      return res.json({
        success: true,
        data: {
          preferences: {},
          theme: "light",
          language: "en",
          timezone: null,
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h"
        }
      });
    }

    res.json({
      success: true,
      data: preferences[0]
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    res.status(500).json({ error: "Failed to fetch user preferences" });
  }
});

export default router;
