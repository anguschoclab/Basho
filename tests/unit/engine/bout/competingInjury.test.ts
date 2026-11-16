import { describe, it, expect } from "vitest";
import { applyCompetingInjuryPenalty } from "@/engine/bout/boutResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

/**
 * Competing-injury penalties (W A): a rikishi fighting hurt carries a
 * severity × area stat debuff into the bout — a taped ankle costs
 * balance and speed, a bad shoulder costs power and technique.
 */
function rikishi(
  severity: "minor" | "moderate" | "serious",
  location: string
) {
  return MockFactory.createRikishi("r-hurt", {
    injured: true,
    injuryStatus: {
      type: "sprain",
      isInjured: true,
      severity,
      location: location as never,
      weeksRemaining: 3,
    },
    stats: {
      ...MockFactory.createRikishi("x").stats,
      power: 80,
      speed: 80,
      technique: 80,
      balance: 80,
      mental: 80,
    },
  });
}

describe("applyCompetingInjuryPenalty", () => {
  it("leaves a healthy rikishi untouched", () => {
    const r = MockFactory.createRikishi("r-ok");
    const out = applyCompetingInjuryPenalty(r);
    expect(out).toBe(r);
  });

  it("a minor ankle injury costs balance and speed, not power", () => {
    const out = applyCompetingInjuryPenalty(rikishi("minor", "ankle"));
    expect(out.stats.balance).toBeLessThan(80);
    expect(out.stats.speed).toBeLessThan(80);
    expect(out.stats.power).toBe(80);
    expect(out.stats.balance).toBeGreaterThanOrEqual(80 * 0.85); // cap sanity
  });

  it("a moderate shoulder injury costs power and technique", () => {
    const out = applyCompetingInjuryPenalty(rikishi("moderate", "shoulder"));
    expect(out.stats.power).toBeLessThan(80);
    expect(out.stats.technique).toBeLessThan(80);
    expect(out.stats.speed).toBe(80);
    // Moderate debuff is meaningful (~14%).
    expect(out.stats.power).toBeLessThanOrEqual(80 * 0.9);
  });

  it("serious injuries are heavily penalized across the board", () => {
    const out = applyCompetingInjuryPenalty(rikishi("serious", "back"));
    expect(out.stats.power).toBeLessThan(80 * 0.85);
    expect(out.stats.balance).toBeLessThan(80 * 0.85);
  });
});
