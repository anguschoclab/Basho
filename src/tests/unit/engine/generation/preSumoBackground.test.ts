/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { assignPreSumoBackground, applyBackgroundStatModifiers, PRE_SUMO_BACKGROUNDS } from "@/engine/systems/generation/PreSumoBackground";
import { mockRikishi } from "../utils";
import { SeededRNG } from "@/engine/rng";

describe("Pre-Sumo Background (B4)", () => {
  it("PRE_SUMO_BACKGROUNDS has 7 entries (gymnast, judoka, baseball, soccer, wrestler, track, none)", () => {
    expect(PRE_SUMO_BACKGROUNDS).toHaveLength(7);
    const ids = PRE_SUMO_BACKGROUNDS.map((b) => b.id);
    expect(ids).toContain("gymnast");
    expect(ids).toContain("judoka");
    expect(ids).toContain("baseball");
    expect(ids).toContain("soccer");
    expect(ids).toContain("wrestler");
    expect(ids).toContain("track");
    expect(ids).toContain("none");
  });

  it("assignPreSumoBackground returns a valid background from the list", () => {
    const rng = new SeededRNG("test-background-1");
    const bg = assignPreSumoBackground(rng);
    expect(PRE_SUMO_BACKGROUNDS.map((b) => b.id)).toContain(bg);
  });

  it("assignPreSumoBackground is deterministic for the same seed", () => {
    const rng1 = new SeededRNG("deterministic-bg");
    const rng2 = new SeededRNG("deterministic-bg");
    const bg1 = assignPreSumoBackground(rng1);
    const bg2 = assignPreSumoBackground(rng2);
    expect(bg1).toBe(bg2);
  });

  it("gymnast background gives +agility (speed) and +balance", () => {
    const base = mockRikishi("gym-1", { speed: 50, balance: 50 } as any);
    const modified = applyBackgroundStatModifiers(base, "gymnast");
    expect(modified.stats.speed).toBeGreaterThan(50);
    expect(modified.stats.balance).toBeGreaterThan(50);
  });

  it("judoka background gives +technique", () => {
    const base = mockRikishi("judo-1", { technique: 50 } as any);
    const modified = applyBackgroundStatModifiers(base, "judoka");
    expect(modified.stats.technique).toBeGreaterThan(50);
  });

  it("baseball background gives +power", () => {
    const base = mockRikishi("bb-1", { power: 50 } as any);
    const modified = applyBackgroundStatModifiers(base, "baseball");
    expect(modified.stats.power).toBeGreaterThan(50);
  });

  it("soccer background gives +stamina", () => {
    const base = mockRikishi("soc-1", { stamina: 50 } as any);
    const modified = applyBackgroundStatModifiers(base, "soccer");
    expect(modified.stats.stamina).toBeGreaterThan(50);
  });

  it("wrestler background gives +power and +technique", () => {
    const base = mockRikishi("wrestle-1", { power: 50, technique: 50 } as any);
    const modified = applyBackgroundStatModifiers(base, "wrestler");
    expect(modified.stats.power).toBeGreaterThan(50);
    expect(modified.stats.technique).toBeGreaterThan(50);
  });

  it("track background gives +stamina and +speed", () => {
    const base = mockRikishi("track-1", { stamina: 50, speed: 50 } as any);
    const modified = applyBackgroundStatModifiers(base, "track");
    expect(modified.stats.stamina).toBeGreaterThan(50);
    expect(modified.stats.speed).toBeGreaterThan(50);
  });

  it("none background does not modify stats", () => {
    const base = mockRikishi("none-1", { power: 50, speed: 50, technique: 50, balance: 50, stamina: 50 } as any);
    const modified = applyBackgroundStatModifiers(base, "none");
    expect(modified.stats.power).toBe(50);
    expect(modified.stats.speed).toBe(50);
    expect(modified.stats.technique).toBe(50);
    expect(modified.stats.balance).toBe(50);
    expect(modified.stats.stamina).toBe(50);
  });

  it("applyBackgroundStatModifiers sets preSumoBackground field on rikishi", () => {
    const base = mockRikishi("bg-set-1", {} as any);
    const modified = applyBackgroundStatModifiers(base, "gymnast");
    expect(modified.preSumoBackground).toBe("gymnast");
  });

  it("background assignment is weighted (none is most common)", () => {
    // Run many assignments and check distribution
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const rng = new SeededRNG(`dist-test-${i}`);
      const bg = assignPreSumoBackground(rng);
      counts[bg] = (counts[bg] ?? 0) + 1;
    }
    // "none" should be the most common (weighted highest)
    expect(counts["none"]).toBeDefined();
    expect(counts["none"]).toBeGreaterThan(counts["gymnast"] ?? 0);
    // All backgrounds should appear at least once in 1000 rolls
    for (const id of ["gymnast", "judoka", "baseball", "soccer", "wrestler", "track", "none"]) {
      expect(counts[id]).toBeGreaterThan(0);
    }
  });
});
