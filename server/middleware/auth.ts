import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { AuthenticationError, AuthorizationError } from "./errorHandler";

export interface RequestWithUser extends Request {
  user?: any;
  organizationId?: string;
}

export interface JWTPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// Generate JWT tokens
export const generateTokens = (payload: Omit<JWTPayload, "iat" | "exp">) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  
  return { accessToken, refreshToken };
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Token expired");
    }
    throw new AuthenticationError("Invalid token");
  }
};

// Extract token from request
const extractToken = (req: Request): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check query parameter
  if (req.query.token && typeof req.query.token === "string") {
    return req.query.token;
  }

  // Check cookie
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

// Main authentication middleware
export const authMiddleware = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError("No authentication token provided");
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Set user context
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    // Set organization context if not already set
    if (!req.organizationId) {
      req.organizationId = decoded.organizationId;
    }

    // Validate organization context
    if (req.organizationId && req.organizationId !== decoded.organizationId) {
      throw new AuthenticationError("Token organization mismatch");
    }

    logger.debug("User authenticated", {
      requestId: (req as any).requestId,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
    });

    next();
  } catch (error) {
    logger.warn("Authentication failed", {
      requestId: (req as any).requestId,
      error: error.message,
      path: req.path,
      method: req.method,
    });

    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: "Authentication failed",
        message: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: "Authentication error",
      message: "Internal authentication error",
      code: "AUTH_ERROR",
    });
  }
};

// Role-based access control middleware
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError("Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(`Role ${req.user.role} not authorized`);
    }

    next();
  };
};

// Permission-based access control middleware
export const requirePermission = (permissions: string | string[]) => {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError("Authentication required");
    }

    const hasAllPermissions = requiredPermissions.every(permission =>
      req.user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      throw new AuthorizationError(`Insufficient permissions: ${requiredPermissions.join(", ")}`);
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
      };
      
      if (!req.organizationId) {
        req.organizationId = decoded.organizationId;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug("Optional authentication failed", {
      requestId: (req as any).requestId,
      error: error.message,
    });
  }

  next();
};

// Admin-only middleware
export const requireAdmin = requireRole("admin");

// Owner-only middleware
export const requireOwner = requireRole("owner");

// Manager or higher middleware
export const requireManager = requireRole(["owner", "admin", "manager"]);

// User or higher middleware
export const requireUser = requireRole(["owner", "admin", "manager", "user"]);

// Common permission checks
export const requireContactPermission = requirePermission("contacts:manage");
export const requireMessagePermission = requirePermission("messages:send");
export const requireTemplatePermission = requirePermission("templates:manage");
export const requireBroadcastPermission = requirePermission("broadcasts:send");
export const requireAnalyticsPermission = requirePermission("analytics:view");
export const requireIntegrationPermission = requirePermission("integrations:manage");

// Rate limiting for authentication endpoints
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
};

// Token refresh middleware
export const refreshTokenMiddleware = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    
    if (!refreshToken) {
      throw new AuthenticationError("Refresh token required");
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    // Generate new tokens
    const newTokens = generateTokens({
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    });

    // Set new tokens in cookies
    res.cookie("accessToken", newTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", newTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "Tokens refreshed successfully",
      accessToken: newTokens.accessToken,
    });
  } catch (error) {
    logger.warn("Token refresh failed", {
      requestId: (req as any).requestId,
      error: error.message,
    });

    return res.status(401).json({
      error: "Token refresh failed",
      message: error.message,
      code: "REFRESH_FAILED",
    });
  }
};
