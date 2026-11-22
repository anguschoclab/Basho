/**
 * Spec (RED) — foreign-slot vacancy dynamics.
 *
 * Real behavior:
 *  - Some oyakata simply never take foreigners — "Domestic-Only
 *    Traditionalist"/"Regional Loyalist" quirks → bid aggression ≈ 0
 *    (the 0.4 floor must not rescue them).
 *  - Stalled foreign rikishi face stronger intai pressure than natives:
 *    a foreign-slot consumer stuck below makushita for ~6+ basho retires
 *    where an identical native doesn't. (`FOREIGN_SUNK_COST_RETENTION_MULT`
 *    is only a release-ordering weight inside ret_force_stagnant —
 *    `checkRetirement` ignores it, so the pressure must live there.)
 *  - Late-tenure oyakata stop bidding (taper to 0 by age 65).
 */
import { describe, it, expect } from "vitest";
import { foreignSlotBidAggression } from "@/engine/npc/ForeignSlotPolicy";
import { checkRetirement } from "@/engine/lifecycle/retirementCheck";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";

const oyakata = (quirks: string[], age = 50): Oyakata =>
  MockFactory.createOyakata("oy1", { quirks, age } as Partial<Oyakata>);

describe("quirk-driven bid suppression", () => {
  it("a Domestic-Only Traditionalist never bids on foreign talent", () => {
    expect(foreignSlotBidAggression(oyakata(["Domestic-Only Traditionalist"]))).toBeLessThanOrEqual(
      0.05
    );
  });

  it("a Regional Loyalist never bids on foreign talent", () => {
    expect(foreignSlotBidAggression(oyakata(["Regional Loyalist"]))).toBeLessThanOrEqual(0.05);
  });
});

describe("stall-attrition pressure on foreign-slot consumers", () => {
  const stalledForeign = (): Rikishi =>
    MockFactory.createRikishi({
      id: "f-stall",
      nationality: "Mongolia",
      citizenshipStatus: "foreign",
      birthYear: 1997, // 29 in 2026
      division: "sandanme",
      rank: "sandanme",
      careerHistory: Array.from(
        { length: 8 },
        (_, i) =>
          ({
            year: 2024 + Math.floor(i / 6),
            bashoNumber: (i % 6) + 1,
            division: "sandanme",
            wins: 2,
            losses: 5,
          }) as unknown as CareerSnapshot
      ),
    } as Partial<Rikishi>);

  it("a stalled foreign rikishi retires while an identical native continues", () => {
    const foreign = stalledForeign();
    const native = MockFactory.createRikishi({
      ...stalledForeign(),
      id: "j-same",
      nationality: "Japan",
      citizenshipStatus: undefined,
    });
    const fReason = checkRetirement(foreign, 2026, "spec-seed");
    const nReason = checkRetirement(native, 2026, "spec-seed");
    expect(nReason).toBeNull();
    expect(fReason).not.toBeNull();
  });
});

describe("late-tenure bid taper", () => {
  it("an oyakata at 65+ does not open a new foreign pipeline", () => {
    expect(foreignSlotBidAggression(oyakata([], 65))).toBeLessThanOrEqual(0.05);
  });
});
