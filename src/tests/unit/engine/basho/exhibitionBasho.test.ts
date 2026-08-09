import { describe, it, expect } from "vitest";
import {
  isExhibitionBasho,
  isHonbasho,
  getExhibitionBashoSchedule,
  getNextEvent,
  simulateExhibitionBasho,
  EXHIBITION_INJURY_RISK_MULTIPLIER,
  EXHIBITION_STIPEND_MULTIPLIER,
  EXHIBITION_RIVALRY_SEED_CHANCE,
} from "@/engine/systems/basho/ExhibitionBashoService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld } from "../utils";

describe("isExhibitionBasho", () => {
  it("returns true for names ending in -jungyo", () => {
    expect(isExhibitionBasho("february-jungyo")).toBe(true);
    expect(isExhibitionBasho("april-jungyo")).toBe(true);
  });

  it("returns false for honbasho names", () => {
    expect(isExhibitionBasho("hatsu")).toBe(false);
    expect(isExhibitionBasho("haru")).toBe(false);
  });
});

describe("isHonbasho", () => {
  it("returns true for the 6 official basho", () => {
    expect(isHonbasho("hatsu")).toBe(true);
    expect(isHonbasho("haru")).toBe(true);
    expect(isHonbasho("natsu")).toBe(true);
    expect(isHonbasho("nagoya")).toBe(true);
    expect(isHonbasho("aki")).toBe(true);
    expect(isHonbasho("kyushu")).toBe(true);
  });

  it("returns false for exhibition names", () => {
    expect(isHonbasho("february-jungyo")).toBe(false);
  });
});

describe("getExhibitionBashoSchedule", () => {
  it("returns 6 exhibition events between honbasho months", () => {
    const events = getExhibitionBashoSchedule(2025);
    expect(events.length).toBe(6);
  });

  it("events are in months 2, 4, 6, 8, 10, 12 (between honbasho)", () => {
    const events = getExhibitionBashoSchedule(2025);
    const months = events.map((e) => e.month);
    expect(months).toEqual([2, 4, 6, 8, 10, 12]);
  });

  it("all events have isHonbasho = false", () => {
    const events = getExhibitionBashoSchedule(2025);
    for (const e of events) {
      expect(e.isHonbasho).toBe(false);
    }
  });
});

describe("getNextEvent", () => {
  it("returns exhibition event after hatsu (month 1 → 2)", () => {
    const next = getNextEvent("hatsu", 1);
    expect(next.isHonbasho).toBe(false);
    expect(next.month).toBe(2);
  });

  it("returns honbasho after exhibition (month 2 → 3 = haru)", () => {
    const next = getNextEvent("february-jungyo", 2);
    expect(next.isHonbasho).toBe(true);
    expect(next.name).toBe("haru");
    expect(next.month).toBe(3);
  });

  it("wraps to next year after December", () => {
    const next = getNextEvent("december-jungyo", 12);
    expect(next.name).toBe("hatsu");
    expect(next.month).toBe(1);
    expect(next.isHonbasho).toBe(true);
  });
});

describe("simulateExhibitionBasho", () => {
  it("does not update banzuke standings (no banzuke fields in impact)", () => {
    const r1 = mockRikishi("r-1", { shikona: "Rikishi 1" });
    const world = makeMockWorld({
      rikishi: new Map([[r1.id, r1]]),
    });

    const impact = simulateExhibitionBasho(world, "february-jungyo", [r1]);
    // No banzuke-related updates should be in the impact
    expect(impact.entities?.heyaUpdates).toBeUndefined();
    expect(impact.collections?.rikishiToAdd).toBeUndefined();
  });

  it("awards partial stipend to participants", () => {
    const r1 = mockRikishi("r-1", {
      shikona: "Rikishi 1",
      economics: { cash: 1000, popularity: 50 } as any,
    });
    const world = makeMockWorld({
      rikishi: new Map([[r1.id, r1]]),
    });

    const impact = simulateExhibitionBasho(world, "february-jungyo", [r1]);
    const updated = resolveImpacts(world, [impact]);
    const updatedR1 = updated.rikishi.get("r-1");
    const expectedStipend = Math.round(50000 * EXHIBITION_STIPEND_MULTIPLIER);
    expect(updatedR1?.economics?.cash).toBe(1000 + expectedStipend);
  });

  it("skips retired rikishi", () => {
    const r1 = mockRikishi("r-1", {
      shikona: "Rikishi 1",
      isRetired: true,
      economics: { cash: 1000, popularity: 50 } as any,
    });
    const world = makeMockWorld({
      rikishi: new Map([[r1.id, r1]]),
    });

    const impact = simulateExhibitionBasho(world, "february-jungyo", [r1]);
    const updated = resolveImpacts(world, [impact]);
    const updatedR1 = updated.rikishi.get("r-1");
    expect(updatedR1?.economics?.cash).toBe(1000); // unchanged
  });

  it("has reduced injury risk (multiplier < 1.0)", () => {
    expect(EXHIBITION_INJURY_RISK_MULTIPLIER).toBeLessThan(1.0);
  });

  it("stipend multiplier is partial (< 1.0)", () => {
    expect(EXHIBITION_STIPEND_MULTIPLIER).toBeLessThan(1.0);
  });

  it("rivalry seed chance is configured", () => {
    expect(EXHIBITION_RIVALRY_SEED_CHANCE).toBeGreaterThan(0);
    expect(EXHIBITION_RIVALRY_SEED_CHANCE).toBeLessThan(1.0);
  });
});
