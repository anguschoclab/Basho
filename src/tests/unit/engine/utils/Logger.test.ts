import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger, Logger, debug, info, warn, error } from "@/engine/utils/Logger";

describe("Logger", () => {
  beforeEach(() => {
    logger.clearHistory();
    logger.setLevel("info");
    vi.restoreAllMocks();
  });

  describe("getInstance", () => {
    it("returns the same singleton instance", () => {
      expect(Logger.getInstance()).toBe(logger);
      expect(Logger.getInstance()).toBe(Logger.getInstance());
    });
  });

  describe("setLevel / getLevel", () => {
    it("round-trips level changes", () => {
      logger.setLevel("debug");
      expect(logger.getLevel()).toBe("debug");
      logger.setLevel("error");
      expect(logger.getLevel()).toBe("error");
    });
  });

  describe("shouldLog (level threshold)", () => {
    it("suppresses debug when level is info", () => {
      logger.setLevel("info");
      const debugSpy = vi.spyOn(console, "debug");
      logger.debug("test debug");
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("suppresses info when level is warn", () => {
      logger.setLevel("warn");
      const infoSpy = vi.spyOn(console, "info");
      logger.info("test info");
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it("suppresses warn when level is error", () => {
      logger.setLevel("error");
      const warnSpy = vi.spyOn(console, "warn");
      logger.warn("test warn");
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("allows error at all levels >= debug", () => {
      logger.setLevel("debug");
      const errorSpy = vi.spyOn(console, "error");
      logger.error("test error");
      expect(errorSpy).toHaveBeenCalled();
    });

    it("allows debug when level is debug", () => {
      logger.setLevel("debug");
      const debugSpy = vi.spyOn(console, "debug");
      logger.debug("test debug");
      expect(debugSpy).toHaveBeenCalled();
    });
  });

  describe("debug/info/warn/error methods", () => {
    it("debug calls console.debug with formatted prefix", () => {
      logger.setLevel("debug");
      const spy = vi.spyOn(console, "debug");
      logger.debug("hello", "Ctx");
      expect(spy).toHaveBeenCalledWith("[Ctx] hello", "");
    });

    it("info calls console.info with default [Basho] prefix", () => {
      const spy = vi.spyOn(console, "info");
      logger.info("hello");
      expect(spy).toHaveBeenCalledWith("[Basho] hello", "");
    });

    it("warn calls console.warn with context prefix", () => {
      const spy = vi.spyOn(console, "warn");
      logger.warn("warning", "MyCtx");
      expect(spy).toHaveBeenCalledWith("[MyCtx] warning", "");
    });

    it("error calls console.error with data argument", () => {
      const spy = vi.spyOn(console, "error");
      const data = { code: 42 };
      logger.error("fail", "ErrCtx", data);
      expect(spy).toHaveBeenCalledWith("[ErrCtx] fail", data);
    });
  });

  describe("convenience exports", () => {
    it("debug export calls logger.debug", () => {
      logger.setLevel("debug");
      const spy = vi.spyOn(console, "debug");
      debug("msg", "Ctx");
      expect(spy).toHaveBeenCalledWith("[Ctx] msg", "");
    });

    it("info export calls logger.info", () => {
      const spy = vi.spyOn(console, "info");
      info("msg");
      expect(spy).toHaveBeenCalledWith("[Basho] msg", "");
    });

    it("warn export calls logger.warn", () => {
      const spy = vi.spyOn(console, "warn");
      warn("msg", "Ctx");
      expect(spy).toHaveBeenCalledWith("[Ctx] msg", "");
    });

    it("error export calls logger.error", () => {
      const spy = vi.spyOn(console, "error");
      error("msg", "Ctx", { x: 1 });
      expect(spy).toHaveBeenCalledWith("[Ctx] msg", { x: 1 });
    });
  });

  describe("logHistory", () => {
    it("records entries in history", () => {
      logger.warn("test message", "Ctx");
      const history = logger.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].level).toBe("warn");
      expect(history[0].message).toBe("test message");
      expect(history[0].context).toBe("Ctx");
    });

    it("getHistory returns a copy, not the internal reference", () => {
      logger.warn("msg");
      const h1 = logger.getHistory();
      const h2 = logger.getHistory();
      expect(h1).not.toBe(h2);
      expect(h1).toEqual(h2);
    });

    it("clearHistory empties the history", () => {
      logger.warn("msg");
      expect(logger.getHistory()).toHaveLength(1);
      logger.clearHistory();
      expect(logger.getHistory()).toHaveLength(0);
    });

    it("evicts oldest entries when exceeding maxHistorySize", () => {
      // maxHistorySize is 1000; fill 1001 entries
      for (let i = 0; i < 1001; i++) {
        logger.info(`msg-${i}`);
      }
      const history = logger.getHistory();
      expect(history).toHaveLength(1000);
      // First entry should be msg-1 (msg-0 was evicted)
      expect(history[0].message).toBe("msg-1");
      expect(history[999].message).toBe("msg-1000");
    });

    it("does not record suppressed entries", () => {
      logger.setLevel("warn");
      logger.info("should not appear");
      logger.debug("should not appear");
      expect(logger.getHistory()).toHaveLength(0);
    });

    it("records data in history entry", () => {
      const data = { key: "value" };
      logger.warn("msg", "Ctx", data);
      const entry = logger.getHistory()[0];
      expect(entry.data).toBe(data);
    });
  });
});
