import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

describe("Legacy milestone narrative variants", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  const ctx = {
    shikona: "TestRikishi",
    rikishiId: "r-test",
    heya: "TestHeya",
    heyaId: "heya-test",
  };

  it("legacy_milestone_title has at least 4 variants", () => {
    const rng = rngFromSeed("test-variants", "narrative", "title");
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const res = BardEngine.resolve(rng, "events.narrative.legacy_milestone_title", ctx);
      results.add(res.text);
    }
    expect(results.size).toBeGreaterThanOrEqual(4);
  });

  it("legacy_milestone_summary has at least 4 variants", () => {
    const rng = rngFromSeed("test-variants", "narrative", "summary");
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const res = BardEngine.resolve(rng, "events.narrative.legacy_milestone_summary", ctx);
      results.add(res.text);
    }
    expect(results.size).toBeGreaterThanOrEqual(4);
  });

  it("all title variants resolve without [MISSING:] tokens", () => {
    const rng = rngFromSeed("test-variants", "narrative", "title-missing");
    for (let i = 0; i < 50; i++) {
      const res = BardEngine.resolve(rng, "events.narrative.legacy_milestone_title", ctx);
      expect(res.text).not.toContain("[MISSING:");
    }
  });

  it("all summary variants resolve without [MISSING:] tokens", () => {
    const rng = rngFromSeed("test-variants", "narrative", "summary-missing");
    for (let i = 0; i < 50; i++) {
      const res = BardEngine.resolve(rng, "events.narrative.legacy_milestone_summary", ctx);
      expect(res.text).not.toContain("[MISSING:");
    }
  });

  it("no title variant has token leakage (% or {{)", () => {
    const rng = rngFromSeed("test-variants", "narrative", "title-leak");
    for (let i = 0; i < 50; i++) {
      const res = BardEngine.resolve(rng, "events.narrative.legacy_milestone_title", ctx);
      expect(res.text).not.toContain("%");
      expect(res.text).not.toContain("{{");
    }
  });

  it("no summary variant has token leakage (% or {{)", () => {
    const rng = rngFromSeed("test-variants", "narrative", "summary-leak");
    for (let i = 0; i < 50; i++) {
      const res = BardEngine.resolve(rng, "events.narrative.legacy_milestone_summary", ctx);
      expect(res.text).not.toContain("%");
      expect(res.text).not.toContain("{{");
    }
  });
});
