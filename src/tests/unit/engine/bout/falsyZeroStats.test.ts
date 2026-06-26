import { describe, it, expect } from "vitest";
import { applyRivalryToRikishi } from "@/engine/bout/boutResolver";
import { mockRikishi } from "../utils";

describe("applyRivalryToRikishi — falsy zero stat handling", () => {
  it("zero stats are preserved (not defaulted to 50)", () => {
    const r = mockRikishi("zero", {
      power: 0,
      speed: 0,
      technique: 0,
      mental: 0,
      balance: 0,
      stamina: 0,
      aggression: 0,
      condition: 100,
    });

    const result = applyRivalryToRikishi(r, { heat: 0, spite: 0 });

    // condMult for condition=100 should be 1.0, so 0 * 1.0 = 0
    expect(result.stats.power).toBe(0);
    expect(result.stats.speed).toBe(0);
    expect(result.stats.technique).toBe(0);
    expect(result.stats.balance).toBe(0);
    expect(result.stats.stamina).toBe(0);
    // aggression: 0 * (1 + 0) = 0
    expect(result.stats.aggression).toBe(0);
    // mental: 0 * (1 + 0) = 0
    expect(result.stats.mental).toBe(0);
  });

  it("undefined stats fall back to DEFAULT_STAT_VALUE (50)", () => {
    // mockRikishi defaults stats to 50, so we need to craft one with undefined stats
    const r = mockRikishi("undefined-stats", { condition: 100 });
    // Delete stat fields to simulate undefined
    delete (r.stats as any).power;
    delete (r.stats as any).speed;
    delete (r.stats as any).technique;
    delete (r.stats as any).mental;
    delete (r.stats as any).balance;
    delete (r.stats as any).stamina;
    delete (r.stats as any).aggression;

    const result = applyRivalryToRikishi(r, { heat: 0, spite: 0 });

    // Undefined → DEFAULT_STAT_VALUE=50, condMult=1.0 → 50
    expect(result.stats.power).toBe(50);
    expect(result.stats.speed).toBe(50);
    expect(result.stats.technique).toBe(50);
    expect(result.stats.balance).toBe(50);
    expect(result.stats.stamina).toBe(50);
    expect(result.stats.aggression).toBe(50);
    expect(result.stats.mental).toBe(50);
  });

  it("normal stats are unchanged (modulo condition multiplier)", () => {
    const r = mockRikishi("normal", {
      power: 70,
      speed: 60,
      technique: 65,
      mental: 55,
      balance: 50,
      stamina: 80,
      aggression: 45,
      condition: 100,
    });

    const result = applyRivalryToRikishi(r, { heat: 0, spite: 0 });

    // condMult for condition=100 is 1.0, so stats pass through unchanged
    expect(result.stats.power).toBe(70);
    expect(result.stats.speed).toBe(60);
    expect(result.stats.technique).toBe(65);
    expect(result.stats.balance).toBe(50);
    expect(result.stats.stamina).toBe(80);
    expect(result.stats.aggression).toBe(45);
    expect(result.stats.mental).toBe(55);
  });

  it("rivalry heat boosts aggression but preserves zero base", () => {
    const r = mockRikishi("zero-aggression", {
      aggression: 0,
      condition: 100,
    });

    const result = applyRivalryToRikishi(r, { heat: 50, spite: 0 });

    // 0 * (1 + 0.5 * multiplier) = 0 — zero base stays zero
    expect(result.stats.aggression).toBe(0);
  });

  it("rivalry spite modifies mental but preserves zero base", () => {
    const r = mockRikishi("zero-mental", {
      mental: 0,
      condition: 100,
    });

    const result = applyRivalryToRikishi(r, { heat: 0, spite: 50 });

    // 0 * (1 + 0.5 * multiplier) = 0 — zero base stays zero
    expect(result.stats.mental).toBe(0);
  });
});
