/**
 * Spec (RED) — genesis roster concentration.
 *
 * Real heya rosters are heavy-tailed: mean ~13 rikishi across 45 stables,
 * but powerhouse rooms run 24–33 (Isegahama 33, Takasago 26, Sakaigawa /
 * Tamanoi 24 — 2026 JSA tallies). Prestige attracts recruits at every
 * division level, so stature-weighted stables should carry outsized
 * rosters. Genesis previously drew uniformly among tier-eligible
 * stables, producing a compressed 4–20 band with no powerhouse.
 */
import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";

const SEEDS = ["roster-a", "roster-b", "roster-c"];

describe("genesis roster concentration", () => {
  it("produces at least one powerhouse stable (>= 25 rikishi)", () => {
    for (const seed of SEEDS) {
      const world = generateInitialWorld(seed);
      const max = Math.max(
        ...[...world.heyas.values()].map((h) => (h.rikishiIds ?? []).length)
      );
      expect(max).toBeGreaterThanOrEqual(25);
    }
  });

  it("keeps the whole field housed — every rikishi has a heya", () => {
    const world = generateInitialWorld(SEEDS[0]);
    const housed = new Set<string>();
    for (const h of world.heyas.values())
      for (const id of h.rikishiIds ?? []) housed.add(id);
    expect(housed.size).toBe(world.rikishi.size);
  });

  it("stature correlates with roster size — top-band stables out-recruit fragile ones", () => {
    const world = generateInitialWorld(SEEDS[1]);
    const BAND_ORDER = [
      "legendary",
      "powerful",
      "established",
      "rebuilding",
      "fragile",
      "new",
    ] as const;
    const topSizes: number[] = [];
    const bottomSizes: number[] = [];
    for (const h of world.heyas.values()) {
      const idx = BAND_ORDER.indexOf(h.statureBand as (typeof BAND_ORDER)[number]);
      const size = (h.rikishiIds ?? []).length;
      if (idx >= 0 && idx <= 1) topSizes.push(size);
      else if (idx >= 4) bottomSizes.push(size);
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    expect(mean(topSizes)).toBeGreaterThan(mean(bottomSizes));
  });
});
