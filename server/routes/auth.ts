import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const router = Router();
const sql = neon(process.env.DATABASE_URL!);

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required"
      });
    }

    // Find user by username or email
    const users = await sql`
      SELECT u.*, o.name as organization_name 
      FROM users u 
      JOIN organizations o ON u.organization_id = o.id 
      WHERE (u.username = ${identifier} OR u.email = ${identifier}) 
      AND u.is_active = true
    `;

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        organizationId: user.organization_id,
        role: user.role 
      },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );

    // Update last login
    await sql`
      UPDATE users SET last_login = NOW() WHERE id = ${user.id}
    `;

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Signup endpoint
router.post("/signup", async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      username, 
      email, 
      password, 
      organizationName 
    } = req.body;

    if (!firstName || !lastName || !username || !email || !password || !organizationName) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE username = ${username} OR email = ${email}
    `;

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists"
      });
    }

    // Create organization
    const [org] = await sql`
      INSERT INTO organizations (name, slug, domain, plan, status)
      VALUES (${organizationName}, ${organizationName.toLowerCase().replace(/\s+/g, '-')}, 'localhost', 'enterprise', 'active')
      RETURNING id
    `;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await sql`
      INSERT INTO users (organization_id, first_name, last_name, username, email, password, role, permissions)
      VALUES (${org.id}, ${firstName}, ${lastName}, ${username}, ${email}, ${hashedPassword}, 'owner', '["*"]')
      RETURNING id, username, email, first_name, last_name, role
    `;

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        organizationId: org.id,
        role: user.role 
      },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user,
        organization: { id: org.id, name: organizationName },
        token
      }
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Get current user
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
    
    const users = await sql`
      SELECT u.*, o.name as organization_name 
      FROM users u 
      JOIN organizations o ON u.organization_id = o.id 
      WHERE u.id = ${decoded.userId} AND u.is_active = true
    `;

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];
    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });

  } catch (error) {
    console.error("Get user error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
});

export default router;
