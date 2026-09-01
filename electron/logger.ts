/**
 * electron/logger.ts — Minimal structured logger for the Electron main process.
 *
 * Decoupled from src/engine/utils/Logger.ts (which is renderer-bundled).
 * Adds a consistent [electron:main] prefix and supports log levels via
 * the ELECTRON_LOG_LEVEL env var (debug|info|warn|error). Defaults to info.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env["ELECTRON_LOG_LEVEL"] as LogLevel | undefined) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function format(level: LogLevel, message: string): string {
  return `[electron:main] ${level.toUpperCase()} ${message}`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog("debug")) console.debug(format("debug", message), ...args);
  },
  info(message: string, ...args: unknown[]): void {
    if (shouldLog("info")) console.info(format("info", message), ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog("warn")) console.warn(format("warn", message), ...args);
  },
  error(message: string, ...args: unknown[]): void {
    if (shouldLog("error")) console.error(format("error", message), ...args);
  },
};
