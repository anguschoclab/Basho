import { describe, it, expect } from "vitest";
import { computeSignChance } from "@/engine/recruitment/scoutMissions";

const base = {
  competingSuitors: 1,
  heyaPrestige: 60,
  negotiation: 7,
  hasDormitory: false,
  offerType: "standard" as const,
  interest: "medium" as const,
};

describe("computeSignChance (P4)", () => {
  it("is bounded 0.02..0.95", () => {
    expect(
      computeSignChance({ ...base, competingSuitors: 10, heyaPrestige: 0, negotiation: 0, interest: "low" })
    ).toBeGreaterThanOrEqual(0.02);
    expect(
      computeSignChance({ ...base, heyaPrestige: 100, negotiation: 10, interest: "all_in", offerType: "aggressive", hasDormitory: true })
    ).toBeLessThanOrEqual(0.95);
  });

  it("dormitory and aggressive offers raise the chance; suitors lower it", () => {
    expect(computeSignChance({ ...base, hasDormitory: true })).toBeGreaterThan(computeSignChance(base));
    expect(computeSignChance({ ...base, offerType: "aggressive" })).toBeGreaterThan(computeSignChance(base));
    expect(computeSignChance({ ...base, competingSuitors: 4 })).toBeLessThan(computeSignChance(base));
  });

  it("is deterministic for identical inputs", () => {
    expect(computeSignChance(base)).toBe(computeSignChance(base));
  });
});
