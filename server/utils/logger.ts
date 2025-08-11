import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const { combine, timestamp, errors, json, printf, colorize } = format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Custom format for file output
const fileFormat = printf(({ level, message, timestamp, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });
});

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: "whatsapp-business-hub",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    // Console transport for development
    ...(process.env.NODE_ENV === "development"
      ? [
          new transports.Console({
            format: combine(
              colorize(),
              timestamp({ format: "HH:mm:ss" }),
              consoleFormat
            ),
          }),
        ]
      : []),

    // File transports for production
    ...(process.env.NODE_ENV === "production"
      ? [
          // Error logs
          new DailyRotateFile({
            filename: "logs/error-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            level: "error",
            maxSize: "20m",
            maxFiles: "14d",
            format: fileFormat,
          }),

          // Combined logs
          new DailyRotateFile({
            filename: "logs/combined-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxSize: "20m",
            maxFiles: "14d",
            format: fileFormat,
          }),
        ]
      : []),
  ],
});

// Add error handling for the logger itself
logger.on("error", (error) => {
  console.error("Logger error:", error);
});

// Create a simple console logger for development
const simpleLogger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[INFO] ${message}`, ...args);
    } else {
      logger.info(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[WARN] ${message}`, ...args);
    } else {
      logger.warn(message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.error(`[ERROR] ${message}`, ...args);
    } else {
      logger.error(message, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, ...args);
    } else {
      logger.debug(message, ...args);
    }
  },
};

export { logger, simpleLogger };
