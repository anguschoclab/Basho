// @vitest-environment node

/**
 * Tests for electron/logger.ts — the electron-side structured logger.
 * Decoupled from src/engine/utils/Logger.ts (renderer-side).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("electron/logger", () => {
  const originalLevel = process.env["ELECTRON_LOG_LEVEL"];
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalLevel === undefined) delete process.env["ELECTRON_LOG_LEVEL"];
    else process.env["ELECTRON_LOG_LEVEL"] = originalLevel;
  });

  it("error logs with [electron:main] ERROR prefix by default", async () => {
    const { logger } = await import("../../../../electron/logger");
    logger.error("test error");
    expect(errorSpy).toHaveBeenCalledWith("[electron:main] ERROR test error");
  });

  it("warn logs with [electron:main] WARN prefix by default", async () => {
    const { logger } = await import("../../../../electron/logger");
    logger.warn("test warn");
    expect(warnSpy).toHaveBeenCalledWith("[electron:main] WARN test warn");
  });

  it("info logs with [electron:main] INFO prefix by default", async () => {
    const { logger } = await import("../../../../electron/logger");
    logger.info("test info");
    expect(infoSpy).toHaveBeenCalledWith("[electron:main] INFO test info");
  });

  it("debug does NOT log by default (level=info)", async () => {
    const { logger } = await import("../../../../electron/logger");
    logger.debug("test debug");
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("debug logs when ELECTRON_LOG_LEVEL=debug", async () => {
    process.env["ELECTRON_LOG_LEVEL"] = "debug";
    vi.resetModules();
    const { logger } = await import("../../../../electron/logger");
    logger.debug("test debug");
    expect(debugSpy).toHaveBeenCalledWith("[electron:main] DEBUG test debug");
  });

  it("error does NOT log when ELECTRON_LOG_LEVEL=error", async () => {
    process.env["ELECTRON_LOG_LEVEL"] = "error";
    vi.resetModules();
    const { logger } = await import("../../../../electron/logger");
    logger.warn("should be suppressed");
    logger.info("should be suppressed");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    logger.error("should appear");
    expect(errorSpy).toHaveBeenCalledWith("[electron:main] ERROR should appear");
  });

  it("passes extra args to console methods", async () => {
    const { logger } = await import("../../../../electron/logger");
    const extra = { code: 42 };
    logger.error("fail", extra);
    expect(errorSpy).toHaveBeenCalledWith("[electron:main] ERROR fail", extra);
  });

  it("exports logger object with error, warn, info, debug methods", async () => {
    const { logger } = await import("../../../../electron/logger");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });
});
