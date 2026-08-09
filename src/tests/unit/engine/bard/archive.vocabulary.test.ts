import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine, interpolate } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/rng";

describe("Phase 4: Vocabulary-token template dedup", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  // ── %ADJ% token resolves ───────────────────────────────────────────────
  it("interpolate('%ADJ% rikishi', { intensity: 3 }) contains an adjective", () => {
    const result = interpolate("The %ADJ% rikishi", { intensity: 3 });
    expect(result).not.toContain("%ADJ%");
    expect(result).not.toContain("[MISSING");
    expect(result.length).toBeGreaterThan("The ".length);
  });

  it("interpolate('%ADJ% rikishi', { intensity: 1 }) contains an adjective", () => {
    const result = interpolate("The %ADJ% rikishi", { intensity: 1 });
    expect(result).not.toContain("%ADJ%");
    expect(result).not.toContain("[MISSING");
  });

  // ── %VERB% token resolves ──────────────────────────────────────────────
  it("interpolate('He %VERB% the opponent', { intensity: 2 }) contains a verb", () => {
    const result = interpolate("He %VERB% the opponent", { intensity: 2 });
    expect(result).not.toContain("%VERB%");
    expect(result).not.toContain("[MISSING");
  });

  // ── %ADV% token resolves ───────────────────────────────────────────────
  it("interpolate('He moved %ADV%', { intensity: 1 }) contains an adverb", () => {
    const result = interpolate("He moved %ADV%", { intensity: 1 });
    expect(result).not.toContain("%ADV%");
    expect(result).not.toContain("[MISSING");
  });

  // ── Deterministic: same seed + intensity → same output ─────────────────
  it("interpolate is deterministic for %ADJ% with same seed", () => {
    const rng1 = new SeededRNG("test-vocab-1");
    const rng2 = new SeededRNG("test-vocab-1");
    // interpolate doesn't take rng directly, but resolve does
    // We test determinism via resolve with same seed
    const r1 = BardEngine.resolve(rng1, "combat.phases.tachiai", {
      intensity: 2,
      WINNER: "A",
      LOSER: "B",
    });
    const r2 = BardEngine.resolve(rng2, "combat.phases.tachiai", {
      intensity: 2,
      WINNER: "A",
      LOSER: "B",
    });
    expect(r1.text).toBe(r2.text);
  });

  // ── Intensity affects vocabulary ───────────────────────────────────────
  it("different intensities produce different tachiai outputs", () => {
    const rng1 = new SeededRNG("test-vocab-intensity");
    const rng2 = new SeededRNG("test-vocab-intensity");
    const rng3 = new SeededRNG("test-vocab-intensity");
    const r1 = BardEngine.resolve(rng1, "combat.phases.tachiai", {
      intensity: 1,
      WINNER: "A",
      LOSER: "B",
    });
    const r2 = BardEngine.resolve(rng2, "combat.phases.tachiai", {
      intensity: 2,
      WINNER: "A",
      LOSER: "B",
    });
    const r3 = BardEngine.resolve(rng3, "combat.phases.tachiai", {
      intensity: 3,
      WINNER: "A",
      LOSER: "B",
    });
    expect(r1.text).not.toBe(r2.text);
    expect(r2.text).not.toBe(r3.text);
    expect(r1.text).not.toBe(r3.text);
  });

  // ── Collapsed tachiai triplet ──────────────────────────────────────────
  it("resolve('combat.phases.tachiai', { intensity: 1 }) produces non-empty text", () => {
    const rng = new SeededRNG("test-tachiai-1");
    const result = BardEngine.resolve(rng, "combat.phases.tachiai", {
      intensity: 1,
      WINNER: "A",
      LOSER: "B",
    });
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("resolve('combat.phases.tachiai', { intensity: 2 }) produces non-empty text", () => {
    const rng = new SeededRNG("test-tachiai-2");
    const result = BardEngine.resolve(rng, "combat.phases.tachiai", {
      intensity: 2,
      WINNER: "A",
      LOSER: "B",
    });
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("resolve('combat.phases.tachiai', { intensity: 3 }) produces non-empty text", () => {
    const rng = new SeededRNG("test-tachiai-3");
    const result = BardEngine.resolve(rng, "combat.phases.tachiai", {
      intensity: 3,
      WINNER: "A",
      LOSER: "B",
    });
    expect(result.text.length).toBeGreaterThan(0);
  });

  // ── Collapsed engagement triplets ──────────────────────────────────────
  describe.each(["push", "belt", "trick", "speed"])("engagement.%s collapsed", (type) => {
    it.each([1, 2, 3])("intensity %i produces non-empty text", (intensity) => {
      const rng = new SeededRNG(`test-eng-${type}-${intensity}`);
      const result = BardEngine.resolve(rng, `combat.engagement.${type}`, {
        intensity,
        ATTACKER: "TestRiki",
      });
      expect(result.text.length).toBeGreaterThan(0);
    });

    it("three intensities produce distinct outputs", () => {
      const r1 = BardEngine.resolve(new SeededRNG("test-eng-dist"), `combat.engagement.${type}`, {
        intensity: 1,
        ATTACKER: "A",
      });
      const r2 = BardEngine.resolve(new SeededRNG("test-eng-dist"), `combat.engagement.${type}`, {
        intensity: 2,
        ATTACKER: "A",
      });
      const r3 = BardEngine.resolve(new SeededRNG("test-eng-dist"), `combat.engagement.${type}`, {
        intensity: 3,
        ATTACKER: "A",
      });
      expect(r1.text).not.toBe(r2.text);
      expect(r2.text).not.toBe(r3.text);
      expect(r1.text).not.toBe(r3.text);
    });
  });

  // ── No token leakage ───────────────────────────────────────────────────
  it("tachiai output has no unresolved % tokens", () => {
    const rng = new SeededRNG("test-tachiai-leak");
    const result = BardEngine.resolve(rng, "combat.phases.tachiai", {
      intensity: 2,
      WINNER: "A",
      LOSER: "B",
    });
    expect(result.text).not.toContain("%ADJ%");
    expect(result.text).not.toContain("%VERB%");
    expect(result.text).not.toContain("%ADV%");
  });

  it("engagement output has no unresolved % tokens", () => {
    const rng = new SeededRNG("test-eng-leak");
    const result = BardEngine.resolve(rng, "combat.engagement.push", {
      intensity: 2,
      ATTACKER: "A",
    });
    expect(result.text).not.toContain("%ADJ%");
    expect(result.text).not.toContain("%VERB%");
    expect(result.text).not.toContain("%ADV%");
  });
});
