import { describe, it, expect } from "vitest";
import {
  currentAbility,
  potentialAbility,
  abilityToStars,
  CA_STAT_WEIGHTS,
  TRAINABLE_STAT_KEYS,
} from "@/engine/development/caPa";
import { mockRikishi } from "@tests/unit/engine/utils";
import type { RikishiStats } from "@/engine/types/rikishi";

const stats = (v: number): RikishiStats =>
  ({
    power: v,
    technique: v,
    speed: v,
    weight: 150,
    stamina: v,
    mental: v,
    adaptability: v,
    balance: v,
    aggression: v,
    experience: v,
  }) as RikishiStats;

describe("CA_STAT_WEIGHTS", () => {
  it("sums to 1 over the 8 trainable stats", () => {
    const sum = Object.values(CA_STAT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(Object.keys(CA_STAT_WEIGHTS).sort()).toEqual([...TRAINABLE_STAT_KEYS].sort());
  });
});

describe("currentAbility", () => {
  it("maps uniform stats onto the 0–200 scale", () => {
    expect(currentAbility(mockRikishi("r0", { stats: stats(0) }))).toBe(0);
    expect(currentAbility(mockRikishi("r50", { stats: stats(50) }))).toBe(100);
    expect(currentAbility(mockRikishi("r100", { stats: stats(100) }))).toBe(200);
  });

  it("is monotonic in every weighted stat", () => {
    for (const key of TRAINABLE_STAT_KEYS) {
      const base = stats(50);
      const bumped = { ...base, [key]: base[key as keyof RikishiStats] + 20 } as RikishiStats;
      expect(
        currentAbility(mockRikishi("r", { stats: bumped })),
        `${key} bump should raise CA`
      ).toBeGreaterThan(currentAbility(mockRikishi("r", { stats: base })));
    }
  });

  it("is capped at 200 for over-100 stats", () => {
    expect(currentAbility(mockRikishi("r", { stats: stats(120) }))).toBe(200);
  });
});

describe("potentialAbility", () => {
  it("applies ceilingFraction to the potential stats", () => {
    const r = mockRikishi("r", {
      stats: stats(60),
      potential: {
        stats: stats(100),
        heightCm: 185,
        weightKg: 150,
        developmentSpeed: 1,
        peakAgeOffset: 0,
        ceilingFraction: 1,
        profile: "prodigy",
      },
    });
    expect(potentialAbility(r)).toBe(200);
    const capped = mockRikishi("r2", {
      stats: stats(60),
      potential: {
        stats: stats(100),
        heightCm: 185,
        weightKg: 150,
        developmentSpeed: 1,
        peakAgeOffset: 0,
        ceilingFraction: 0.75,
        profile: "journeyman",
      },
    });
    expect(potentialAbility(capped)).toBe(150);
  });

  it("PA is never below CA — a realized player has met his potential", () => {
    const r = mockRikishi("r", {
      stats: stats(80),
      potential: {
        stats: stats(60),
        heightCm: 185,
        weightKg: 150,
        developmentSpeed: 1,
        peakAgeOffset: 0,
        ceilingFraction: 1,
        profile: "standard",
      },
    });
    expect(potentialAbility(r)).toBeGreaterThanOrEqual(currentAbility(r));
  });

  it("falls back to currentAbility when no potential block exists", () => {
    const r = mockRikishi("r", { stats: stats(55), potential: undefined });
    expect(potentialAbility(r)).toBe(currentAbility(r));
  });
});

describe("abilityToStars", () => {
  it("maps ability to 0–5 in half-star steps", () => {
    expect(abilityToStars(0)).toBe(0);
    expect(abilityToStars(40)).toBe(1);
    expect(abilityToStars(100)).toBe(2.5);
    expect(abilityToStars(200)).toBe(5);
  });

  it("rounds to the nearest half star and clamps", () => {
    expect(abilityToStars(20)).toBe(0.5);
    expect(abilityToStars(30)).toBe(1); // 0.75 rounds to 1.0
    expect(abilityToStars(199)).toBe(5);
    expect(abilityToStars(-10)).toBe(0);
    expect(abilityToStars(250)).toBe(5);
  });
});
