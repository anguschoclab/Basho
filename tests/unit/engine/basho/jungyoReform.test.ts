/**
 * Spec (RED) — jungyō calendar realism and the 2027 reform.
 *
 * Real calendar: ~90 tour days/year; August is the dense gauntlet
 * (28 stops in 31 days); summer fatigue should exceed a winter tour's.
 * From summer 2027 the JSA cuts into the low-70s, mostly out of summer,
 * adds the recovery package (trainers + 2 bus seats/sekitori) and A/C
 * venue selection — while `jsaJungyoStipendMultiplier` (already shipped)
 * raises allowances. Current schedule entries carry only month/location —
 * no tourDays, no season, no reform flag.
 */
import { describe, it, expect } from "vitest";
import { getExhibitionBashoSchedule } from "@/engine/basho/ExhibitionBashoService";

interface TourEntry {
  name: string;
  month: number;
  tourDays?: number;
  season?: "winter" | "spring" | "summer" | "autumn";
  reformApplied?: boolean;
}

const asTours = (year: number): TourEntry[] =>
  getExhibitionBashoSchedule(year) as unknown as TourEntry[];

describe("jungyō schedule granularity", () => {
  it("each tour carries day counts summing to ~90/year pre-reform", () => {
    const tours = asTours(2026);
    const total = tours.reduce((a, t) => a + (t.tourDays ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(85);
    expect(total).toBeLessThanOrEqual(95);
  });

  it("august is the densest tour (the 28-in-31 gauntlet)", () => {
    const tours = asTours(2026);
    const august = tours.find((t) => t.month === 8)!;
    const others = tours.filter((t) => t.month !== 8);
    for (const t of others) {
      expect(august.tourDays ?? 0).toBeGreaterThanOrEqual(t.tourDays ?? 0);
    }
  });
});

describe("2027 reform", () => {
  it("total tour days drop into the 70s starting summer 2027", () => {
    const total = asTours(2027).reduce((a, t) => a + (t.tourDays ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(70);
    expect(total).toBeLessThanOrEqual(79);
  });

  it("the reduction comes mostly out of the summer schedule", () => {
    const aug26 = asTours(2026).find((t) => t.month === 8)!;
    const aug27 = asTours(2027).find((t) => t.month === 8)!;
    expect((aug26.tourDays ?? 0) - (aug27.tourDays ?? 0)).toBeGreaterThanOrEqual(5);
  });
});
