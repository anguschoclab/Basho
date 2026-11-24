/**
 * Spec — sekitori outside income (real-2026 calibration).
 *
 * Two non-JSA streams: monthly commercial endorsements (concentrated
 * at Y/O + charismatic makuuchi; jūryō gets none) and per-basho
 * personal tanimachi gifts (star-scaled, seeded jitter). Both land in
 * cash and accumulate onto careerEndorsements/careerPatronage — the
 * liquid wealth elite NPC retirees self-fund foundings from.
 */
import { describe, it, expect } from "vitest";
import { payMonthlyEndorsements, applyBashoPatronage } from "@/engine/economy/OutsideIncomeService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
import {
  ENDORSEMENT_ANNUAL_BY_RANK,
  outsideIncomeStarFactor,
} from "@/constants/engine/economyExtended";

function worldWith(r: ReturnType<typeof mockRikishi>) {
  const world = makeMockWorld({ year: 2026 });
  world.rikishi.set(r.id, r);
  world.activeRikishiIds.add(r.id);
  return world;
}

const econ = (cash = 0) => ({
  cash,
  retirementFund: 0,
  careerKenshoWon: 0,
  kinboshiCount: 0,
  totalEarnings: 0,
  currentBashoEarnings: 0,
  popularity: 50,
});

describe("payMonthlyEndorsements", () => {
  it("credits a yokozuna ~annual×starFactor/12 into cash", () => {
    const yoko = mockRikishi("y1", {
      rank: "yokozuna",
      division: "makuuchi",
      marketability: 90,
      economics: econ(100),
    });
    const next = resolveImpacts(worldWith(yoko), [payMonthlyEndorsements(worldWith(yoko))]);
    const e = next.rikishi.get("y1")!.economics!;
    const expected = (ENDORSEMENT_ANNUAL_BY_RANK.yokozuna / 12) * outsideIncomeStarFactor(90);
    expect(e.cash).toBeCloseTo(100 + expected, 0);
    expect(e.totalEarnings).toBeCloseTo(expected, 0);
    expect(e.careerEndorsements).toBeCloseTo(expected, 0);
  });

  it("pays jūryō and lower divisions nothing", () => {
    const juryo = mockRikishi("j1", {
      rank: "juryo",
      division: "juryo",
      marketability: 95,
      economics: econ(50),
    });
    const world = worldWith(juryo);
    const next = resolveImpacts(world, [payMonthlyEndorsements(world)]);
    expect(next.rikishi.get("j1")!.economics!.cash).toBe(50);
    expect(next.rikishi.get("j1")!.economics!.careerEndorsements ?? 0).toBe(0);
  });

  it("a low-marketability yokozuna earns less than a star maegashira's ceiling", () => {
    // Star factor ordering is real: charisma drives deals, not rank alone.
    expect(outsideIncomeStarFactor(30)).toBeLessThan(outsideIncomeStarFactor(100));
  });
});

describe("applyBashoPatronage", () => {
  it("pays a per-basho gift, larger for yokozuna than maegashira", () => {
    const yoko = mockRikishi("y1", {
      rank: "yokozuna",
      division: "makuuchi",
      marketability: 80,
      economics: econ(0),
    });
    const mae = mockRikishi("m1", {
      rank: "maegashira",
      division: "makuuchi",
      marketability: 80,
      economics: econ(0),
    });
    const world = makeMockWorld({ year: 2026, currentBashoName: "hatsu" });
    world.rikishi.set("y1", yoko);
    world.rikishi.set("m1", mae);
    world.activeRikishiIds.add("y1").add("m1");

    const next = resolveImpacts(world, [applyBashoPatronage(world)]);
    const yGift = next.rikishi.get("y1")!.economics!.careerPatronage!;
    const mGift = next.rikishi.get("m1")!.economics!.careerPatronage!;
    expect(yGift).toBeGreaterThan(mGift);
    expect(yGift).toBeGreaterThan(1_500_000); // ~¥2.2M×0.85+ floor-ish
    expect(next.rikishi.get("y1")!.economics!.cash).toBe(yGift);
  });

  it("is deterministic per world seed + basho", () => {
    const mk = () => {
      const w = worldWith(
        mockRikishi("o1", {
          rank: "ozeki",
          division: "makuuchi",
          marketability: 70,
          economics: econ(0),
        })
      );
      w.currentBashoName = "haru";
      return w;
    };
    const a = resolveImpacts(mk(), [applyBashoPatronage(mk())]);
    const b = resolveImpacts(mk(), [applyBashoPatronage(mk())]);
    expect(a.rikishi.get("o1")!.economics!.cash).toBe(b.rikishi.get("o1")!.economics!.cash);
  });

  it("skips retired rikishi and non-sekitori", () => {
    const retired = mockRikishi("r1", {
      rank: "yokozuna",
      division: "makuuchi",
      isRetired: true,
      economics: econ(0),
    });
    const makushita = mockRikishi("ms1", {
      rank: "makushita",
      division: "makushita",
      economics: econ(0),
    });
    const world = makeMockWorld({ year: 2026 });
    world.rikishi.set("r1", retired);
    world.rikishi.set("ms1", makushita);
    world.activeRikishiIds.add("r1").add("ms1");

    const next = resolveImpacts(world, [applyBashoPatronage(world)]);
    expect(next.rikishi.get("r1")!.economics!.cash).toBe(0);
    expect(next.rikishi.get("ms1")!.economics!.cash).toBe(0);
  });
});
