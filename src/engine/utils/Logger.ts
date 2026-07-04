/**
 * Logger.ts — Centralized logging utility for the engine.
 * Replaces console.log/warn/error with a structured logging system
 * that can be configured for different environments.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = "info";
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      data,
    };

    // Keep history bounded
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Format output
    const prefix = context ? `[${context}]` : "[Basho]";
    const formatted = `${prefix} ${message}`;

    // Output to console in development
    switch (level) {
      case "debug":
        console.debug(formatted, data ?? "");
        break;
      case "info":
        console.info(formatted, data ?? "");
        break;
      case "warn":
        console.warn(formatted, data ?? "");
        break;
      case "error":
        console.error(formatted, data ?? "");
        break;
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.log("debug", message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log("info", message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log("warn", message, context, data);
  }

  error(message: string, context?: string, data?: unknown): void {
    this.log("error", message, context, data);
  }

  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports for direct import
export const debug = (message: string, context?: string, data?: unknown) =>
  logger.debug(message, context, data);
export const info = (message: string, context?: string, data?: unknown) =>
  logger.info(message, context, data);
export const warn = (message: string, context?: string, data?: unknown) =>
  logger.warn(message, context, data);
export const error = (message: string, context?: string, data?: unknown) =>
  logger.error(message, context, data);
