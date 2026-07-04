import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/engine/utils/Logger";
import { safeCall } from "@/engine/utils/safe";
import { parseLLMResponse } from "@/engine/utils/jsonParser";
import { applyOyakataCreationConfig } from "@/engine/systems/generation/applyOyakataConfig";
import { generateGovernanceHeadline } from "@/engine/systems/media/MediaEventService";
import { advanceDays } from "@/engine/tick/tickDaily";
import { interpolate } from "@/engine/bard/BardEngine";
import { makeMockWorld, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";

describe("logging migration to Logger", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger.clearHistory();
    logger.setLevel("debug");
    warnSpy = vi.spyOn(logger, "warn");
    errorSpy = vi.spyOn(logger, "error");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("safe.ts", () => {
    it("routes recovery warning through logger.warn with context 'safeCall'", () => {
      safeCall(() => {
        throw new Error("boom");
      });
      expect(warnSpy).toHaveBeenCalledWith(
        "Recovered from error in secondary system",
        "safeCall",
        expect.any(Error)
      );
    });

    it("does not call console.warn directly", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn");
      safeCall(() => {
        throw new Error("boom");
      });
      // Logger internally calls console.warn, but with formatted prefix
      // The key check: console.warn is called by Logger, not by safe.ts directly
      expect(consoleWarnSpy).toHaveBeenCalled();
      // The call should include the [safeCall] prefix, not raw "Recovered"
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("[safeCall]");
      expect(callArg).not.toBe("Recovered from error in secondary system:");
    });
  });

  describe("applyOyakataConfig.ts", () => {
    it("routes 'Heya not found' through logger.warn with context 'applyOyakataCreationConfig'", () => {
      const world = makeMockWorld();
      applyOyakataCreationConfig(world, "nonexistent-heya", {
        backstoryId: "former_ozeki",
        name: "Test",
      } as never);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Heya not found"),
        "applyOyakataCreationConfig",
        undefined
      );
    });

    it("routes 'Unknown backstoryId' through logger.warn", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("h-player", { oyakataId: "oy-player" });
      world.heyas.set("h-player", heya);
      world.oyakata.set("oy-player", { id: "oy-player" } as never);
      applyOyakataCreationConfig(world, "h-player", {
        backstoryId: "nonexistent",
        name: "Test",
      } as never);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown backstoryId"),
        "applyOyakataCreationConfig",
        undefined
      );
    });
  });

  describe("MediaEventService.ts", () => {
    it("does not call console.log directly for governance headline", () => {
      const consoleLogSpy = vi.spyOn(console, "log");
      const world = makeMockWorld({
        mediaState: {
          headlines: [],
          heyaPressure: {},
        } as never,
      } as Partial<WorldState>);
      world.heyas.set("h1", makeMockHeya("h1"));

      generateGovernanceHeadline({
        world,
        heyaId: "h1",
        templatePath: "institutional.welfare.watch_headline",
      });

      // The debug console.log should have been removed
      const mediaLogCall = consoleLogSpy.mock.calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("MediaService: Generated Governance Headline")
      );
      expect(mediaLogCall).toBeUndefined();
    });
  });

  describe("jsonParser.ts", () => {
    it("routes initial parse warning through logger.warn with context 'jsonParser'", () => {
      // Provide input that fails initial parse but can be sanitized
      const input = "```json\n{\"key\": \"value\"}\n```";
      parseLLMResponse(input);
      expect(warnSpy).toHaveBeenCalledWith(
        "Initial parse failed, attempting sanitization...",
        "jsonParser",
        undefined
      );
    });

    it("routes critical parse error through logger.error with context 'jsonParser'", () => {
      const input = "not json at all and cannot be parsed";
      expect(() => parseLLMResponse(input)).toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        "Critical Parse Failure on output",
        "jsonParser",
        expect.any(String)
      );
    });
  });

  describe("tickDaily.ts", () => {
    it("routes advanceDays cap warning through logger.warn with context 'advanceDays'", () => {
      const world = makeMockWorld({ dayIndexGlobal: 0 });
      advanceDays(world, 9999);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("exceeds MAX_DAYS_ADVANCE"),
        "advanceDays",
        undefined
      );
    });
  });

  describe("BardEngine.ts", () => {
    it("routes missing token warning through logger.warn with context 'BardEngine'", () => {
      interpolate("Hello %MISSING_TOKEN%", {});
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Missing token"),
        "BardEngine",
        undefined
      );
    });
  });
});
