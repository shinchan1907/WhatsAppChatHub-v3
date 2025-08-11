import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface RequestWithUser extends Request {
  user?: any;
  organizationId?: string;
}

export const requestLogger = (req: RequestWithUser, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = generateRequestId();

  // Add request ID to request object
  (req as any).requestId = requestId;

  // Log request start
  logger.info("Request started", {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    organizationId: req.headers["x-organization-id"],
    userId: req.user?.id,
    headers: sanitizeHeaders(req.headers),
    body: sanitizeBody(req.body),
    query: req.query,
    params: req.params,
  });

  // Capture response data
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any = null;

  res.send = function (body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.json = function (body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "error" : "info";

    logger[logLevel]("Request completed", {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      organizationId: req.headers["x-organization-id"],
      userId: req.user?.id,
      responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
      userAgent: req.get("User-Agent"),
      referer: req.get("Referer"),
      acceptLanguage: req.get("Accept-Language"),
      acceptEncoding: req.get("Accept-Encoding"),
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn("Slow request detected", {
        requestId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        threshold: "1000ms",
      });
    }

    // Log error responses
    if (res.statusCode >= 400) {
      logger.error("Request failed", {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseBody: sanitizeResponse(responseBody),
      });
    }
  });

  next();
};

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Sanitize sensitive headers
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = "[REDACTED]";
    }
  });
  
  return sanitized;
}

// Sanitize request body
function sanitizeBody(body: any): any {
  if (!body) return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ["password", "token", "secret", "key", "apiKey"];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });
  
  return sanitized;
}

// Sanitize response body
function sanitizeResponse(body: any): any {
  if (!body) return body;
  
  try {
    const parsed = typeof body === "string" ? JSON.parse(body) : body;
    const sanitized = { ...parsed };
    
    // Remove sensitive fields from error responses
    if (sanitized.error && sanitized.error.stack) {
      sanitized.error.stack = "[REDACTED]";
    }
    
    return sanitized;
  } catch {
    return body;
  }
}

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    logger.info("Performance metrics", {
      requestId: (req as any).requestId,
      method: req.method,
      url: req.originalUrl,
      duration: `${duration.toFixed(2)}ms`,
      statusCode: res.statusCode,
      memoryUsage: process.memoryUsage(),
    });
    
    // Alert on very slow requests
    if (duration > 5000) {
      logger.error("Very slow request detected", {
        requestId: (req as any).requestId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        threshold: "5000ms",
      });
    }
  });
  
  next();
};
