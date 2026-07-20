import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

describe("Rivalry heat spike template resolution", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  const rivalryServiceCtx = {
    shikona: "Hakuho",
    rival: "Kakuryu",
    winner: "Hakuho",
    loser: "Kakuryu",
    heat: 50,
    threshold: 40,
  };

  const dramaGeneratorCtx = {
    winner: "Oyakata A",
    loser: "Oyakata B",
    winnerRikishiId: "a1",
    loserRikishiId: "b1",
    shikona: "Oyakata A",
    rival: "Oyakata B",
    status: "formed",
    heat: 15,
  };

  describe("events.rivalry.title", () => {
    it("resolves without [MISSING:] tokens for RivalryService context", () => {
      const rng = rngFromSeed("test-rivalry", "title", "rs");
      const res = BardEngine.resolve(rng, "events.rivalry.title", rivalryServiceCtx);
      expect(res.text.length).toBeGreaterThan(0);
      expect(res.text).not.toContain("[MISSING:");
    });

    it("resolves without [MISSING:] tokens for dramaGenerator context", () => {
      const rng = rngFromSeed("test-rivalry", "title", "dg");
      const res = BardEngine.resolve(rng, "events.rivalry.title", dramaGeneratorCtx);
      expect(res.text.length).toBeGreaterThan(0);
      expect(res.text).not.toContain("[MISSING:");
    });
  });

  describe("events.rivalry.press_rumors", () => {
    it("resolves without [MISSING:] tokens for RivalryService context", () => {
      const rng = rngFromSeed("test-rivalry", "rumors", "rs");
      const res = BardEngine.resolve(rng, "events.rivalry.press_rumors", rivalryServiceCtx);
      expect(res.text.length).toBeGreaterThan(0);
      expect(res.text).not.toContain("[MISSING:");
    });

    it("resolves without [MISSING:] tokens for dramaGenerator context", () => {
      const rng = rngFromSeed("test-rivalry", "rumors", "dg");
      const res = BardEngine.resolve(rng, "events.rivalry.press_rumors", dramaGeneratorCtx);
      expect(res.text.length).toBeGreaterThan(0);
      expect(res.text).not.toContain("[MISSING:");
    });
  });

  describe("token leakage", () => {
    it("no unresolved % tokens in title for either context", () => {
      const rng = rngFromSeed("test-rivalry", "leak", "title");
      const rsRes = BardEngine.resolve(rng, "events.rivalry.title", rivalryServiceCtx);
      const dgRes = BardEngine.resolve(rng, "events.rivalry.title", dramaGeneratorCtx);
      expect(rsRes.text).not.toContain("%");
      expect(dgRes.text).not.toContain("%");
    });

    it("no unresolved % tokens in press_rumors for either context", () => {
      const rng = rngFromSeed("test-rivalry", "leak", "rumors");
      const rsRes = BardEngine.resolve(rng, "events.rivalry.press_rumors", rivalryServiceCtx);
      const dgRes = BardEngine.resolve(rng, "events.rivalry.press_rumors", dramaGeneratorCtx);
      expect(rsRes.text).not.toContain("%");
      expect(dgRes.text).not.toContain("%");
    });
  });
});
