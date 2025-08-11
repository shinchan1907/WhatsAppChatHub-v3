import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface RequestWithOrganization extends Request {
  organizationId?: string;
  organization?: any;
}

export const organizationMiddleware = async (
  req: RequestWithOrganization,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract organization ID from header, query, or subdomain
    const organizationId = extractOrganizationId(req);
    
    if (!organizationId) {
      // Skip organization check for public routes
      if (isPublicRoute(req.path)) {
        return next();
      }
      
      return res.status(400).json({
        error: "Missing organization context",
        message: "Organization ID is required",
        code: "MISSING_ORGANIZATION",
      });
    }

    // Validate organization ID format
    if (!isValidUUID(organizationId)) {
      return res.status(400).json({
        error: "Invalid organization ID",
        message: "Organization ID must be a valid UUID",
        code: "INVALID_ORGANIZATION_ID",
      });
    }

    // Set organization context
    req.organizationId = organizationId;
    
    // Add organization context to response headers for debugging
    res.setHeader("X-Organization-ID", organizationId);

    logger.debug("Organization context set", {
      requestId: (req as any).requestId,
      organizationId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error("Error in organization middleware", {
      requestId: (req as any).requestId,
      error: error.message,
      path: req.path,
      method: req.method,
    });

    return res.status(500).json({
      error: "Organization context error",
      message: "Failed to set organization context",
      code: "ORGANIZATION_CONTEXT_ERROR",
    });
  }
};

// Extract organization ID from various sources
function extractOrganizationId(req: Request): string | null {
  // Priority 1: Header
  const headerOrgId = req.headers["x-organization-id"];
  if (headerOrgId && typeof headerOrgId === "string") {
    return headerOrgId;
  }

  // Priority 2: Query parameter
  const queryOrgId = req.query.organizationId;
  if (queryOrgId && typeof queryOrgId === "string") {
    return queryOrgId;
  }

  // Priority 3: Subdomain
  const subdomain = extractSubdomain(req);
  if (subdomain) {
    return subdomain;
  }

  // Priority 4: JWT token (if available)
  const tokenOrgId = extractOrgIdFromToken(req);
  if (tokenOrgId) {
    return tokenOrgId;
  }

  return null;
}

// Extract subdomain from request
function extractSubdomain(req: Request): string | null {
  const host = req.get("Host");
  if (!host) return null;

  // Handle localhost with port
  if (host.includes("localhost")) {
    const localhostMatch = host.match(/^([^.]+)\.localhost/);
    if (localhostMatch) {
      return localhostMatch[1];
    }
    return null;
  }

  // Handle production domains
  const parts = host.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

// Extract organization ID from JWT token
function extractOrgIdFromToken(req: Request): string | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    // Note: In a real implementation, you would verify the JWT here
    // For now, we'll just extract the organization ID if it's in the token payload
    
    // This is a placeholder - implement proper JWT verification
    return null;
  } catch (error) {
    logger.warn("Failed to extract organization ID from token", {
      error: error.message,
      path: req.path,
    });
    return null;
  }
}

// Check if route is public (doesn't require organization context)
function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    "/health",
    "/status",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/webhooks/whatsapp",
    "/api/webhooks/n8n",
    "/api/webhooks/zapier",
  ];

  return publicRoutes.some(route => path.startsWith(route));
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Organization context getter
export const getOrganizationContext = (req: RequestWithOrganization) => {
  return {
    organizationId: req.organizationId,
    organization: req.organization,
  };
};

// Organization context setter
export const setOrganizationContext = (
  req: RequestWithOrganization,
  organization: any
) => {
  req.organization = organization;
};

// Organization context validator
export const requireOrganization = (
  req: RequestWithOrganization,
  res: Response,
  next: NextFunction
) => {
  if (!req.organizationId) {
    return res.status(400).json({
      error: "Organization required",
      message: "This endpoint requires organization context",
      code: "ORGANIZATION_REQUIRED",
    });
  }

  next();
};
