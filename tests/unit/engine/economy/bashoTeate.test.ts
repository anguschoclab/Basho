import { describe, it, expect } from "vitest";
import { payBashoTeate } from "@/engine/lifecycle/PrizeDistribution";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

const econ = (cash = 0, total = 0) =>
  ({
    cash,
    retirementFund: 0,
    careerKenshoWon: 0,
    kinboshiCount: 0,
    totalEarnings: total,
    currentBashoEarnings: 0,
    popularity: 50,
  }) as any;

function worldWith(r: Rikishi, year = 2026): WorldState {
  return makeMockWorld({ year, rikishi: new Map([[r.id, r]]) });
}

// Era-keyed teate — the July-2026 JSA revision raises allowances from
// Hatsu 2027. With a 0-0 record these specs isolate the flat 場所手当;
// shoshi-kin/kachikoshi-kin per-win amounts are covered in jsaEra.test.ts.
describe("payBashoTeate — centralized allowances (0-0 record: teate only)", () => {
  const cases: Array<[string, number, number]> = [
    ["makushita", 165_000, 180_000],
    ["sandanme", 110_000, 120_000],
    ["jonidan", 88_000, 95_000],
    ["jonokuchi", 77_000, 82_000],
  ];
  for (const [division, y2026, y2027] of cases) {
    it(`${division} receives ¥${y2026} in 2026, ¥${y2027} in 2027`, () => {
      const r = mockRikishi("r1", {
        rank: division as any,
        division: division as any,
        currentBashoWins: 0,
        currentBashoLosses: 0,
        economics: econ(),
      });
      const w26 = worldWith(r, 2026);
      expect(resolveImpacts(w26, [payBashoTeate(w26)]).rikishi.get("r1")?.economics?.cash).toBe(
        y2026
      );
      const w27 = worldWith(r, 2027);
      expect(resolveImpacts(w27, [payBashoTeate(w27)]).rikishi.get("r1")?.economics?.cash).toBe(
        y2027
      );
    });
  }

  it("sekitori (makuuchi/juryo) receives ¥0", () => {
    const makuuchi = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      economics: econ(),
    });
    const juryo = mockRikishi("r2", {
      rank: "juryo",
      division: "juryo",
      economics: econ(),
    });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", makuuchi],
        ["r2", juryo],
      ]),
    });
    const impact = payBashoTeate(world);
    const resolved = resolveImpacts(world, [impact]);
    expect(resolved.rikishi.get("r1")?.economics?.cash).toBe(0);
    expect(resolved.rikishi.get("r2")?.economics?.cash).toBe(0);
  });

  it("total earnings increase matches the payment", () => {
    const r = mockRikishi("r1", {
      rank: "makushita",
      division: "makushita",
      currentBashoWins: 0,
      currentBashoLosses: 0,
      economics: econ(50_000, 200_000),
    });
    const world = worldWith(r, 2026);
    const resolved = resolveImpacts(world, [payBashoTeate(world)]);
    expect(resolved.rikishi.get("r1")?.economics?.totalEarnings).toBe(200_000 + 165_000);
  });
});
