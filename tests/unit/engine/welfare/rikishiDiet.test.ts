import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { phase01_daily_economy } from "@/engine/tick/phases/phase01_daily_economy";
import { calculateWeeklyWelfareDelta } from "@/engine/welfare/WelfareCalculations";
import { DIET_COSTS } from "@/constants/engine/economic";

function mk(diets: Record<string, string | undefined>, heyaDiet: string) {
  const heya = MockFactory.createHeya("h1", { funds: 10_000_000 });
  const rikishi = Object.keys(diets).map((id) => {
    const r = MockFactory.createRikishi(id, { heyaId: "h1" });
    if (diets[id]) (r as { diet?: string }).diet = diets[id];
    return r;
  });
  heya.rikishiIds = rikishi.map((r) => r.id);
  heya.welfareState = {
    welfareRisk: 0,
    morale: 50,
    complianceState: "compliant",
    weeksInState: 0,
    activeDiet: heyaDiet as never,
  };
  return MockFactory.createWorld({
    heyas: new Map([["h1", heya]]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    activeRikishiIds: new Set(rikishi.map((r) => r.id)),
  });
}

describe("per-rikishi diet (P3)", () => {
  it("rikishi.diet overrides heya diet in daily food cost", () => {
    const world = mk({ r1: "premium", r2: "austerity" }, "maintenance");
    const impact = phase01_daily_economy(world);
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as { funds?: number };
    const expected = DIET_COSTS.premium + DIET_COSTS.austerity;
    expect(heyaUp?.funds).toBe(10_000_000 - expected);
  });

  it("falls back to heya diet when rikishi.diet unset", () => {
    const world = mk({ r1: undefined, r2: undefined }, "heavy_bulk");
    const impact = phase01_daily_economy(world);
    const heyaUp = impact.entities?.heyaUpdates?.get("h1") as { funds?: number };
    expect(heyaUp?.funds).toBe(10_000_000 - DIET_COSTS.heavy_bulk * 2);
  });

  it("pro-rates the weekly welfare delta by roster share on austerity", () => {
    const contrib = (r: { reasons: string[] }) =>
      Number(r.reasons.find((x) => x.startsWith("austerity_diet"))?.split("+")[1] ?? 0);
    const deltaOf = (diets: Record<string, string>) => {
      const world = mk(diets, "maintenance");
      const heya = world.heyas.get("h1")!;
      return calculateWeeklyWelfareDelta(world, heya, heya.welfareState!);
    };
    const all = deltaOf({ r1: "austerity", r2: "austerity" });
    const half = deltaOf({ r1: "austerity", r2: "maintenance" });
    const none = deltaOf({ r1: "maintenance", r2: "maintenance" });
    expect(contrib(all)).toBeGreaterThan(contrib(half));
    expect(contrib(half)).toBeGreaterThan(0);
    expect(contrib(none)).toBe(0);
  });
});

describe("expected-injury floor", () => {
  it("a lone injury inside the roster allowance produces no welfare delta", () => {
    // Regression: without the floor ANY injured rikishi produced +risk/week
    // and healthy drift only fired at literally zero injuries, so every
    // stable ratcheted to the sanction threshold (25-yr run: 16/18 heyas
    // sanctioned → recruitment freeze → population collapse).
    const ids = Array.from({ length: 16 }, (_, i) => `r${i}`);
    const heya = MockFactory.createHeya("h1", {
      funds: 10_000_000,
      facilities: { training: 50, recovery: 50, nutrition: 50 },
    });
    const rikishi = ids.map((id, i) => {
      const r = MockFactory.createRikishi(id, { heyaId: "h1" });
      if (i === 0) r.injured = true;
      return r;
    });
    heya.rikishiIds = ids;
    heya.welfareState = {
      welfareRisk: 0,
      morale: 50,
      activeDiet: "maintenance",
      complianceState: "compliant",
      weeksInState: 0,
    };
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      rikishi: new Map(rikishi.map((r) => [r.id, r])),
      activeRikishiIds: new Set(ids),
    });

    const { delta } = calculateWeeklyWelfareDelta(world, heya, heya.welfareState!);
    expect(delta).toBeLessThanOrEqual(0);
  });

  it("pressure beyond the allowance still accrues risk", () => {
    const ids = Array.from({ length: 16 }, (_, i) => `r${i}`);
    const heya = MockFactory.createHeya("h1", {
      funds: 10_000_000,
      facilities: { training: 50, recovery: 50, nutrition: 50 },
    });
    const rikishi = ids.map((id, i) => {
      const r = MockFactory.createRikishi(id, { heyaId: "h1" });
      // 3 serious injuries = pressure 24, far above the 2-injury allowance
      if (i < 3) {
        r.injured = true;
        r.injuryStatus = { isInjured: true, severity: "serious" } as never;
      }
      return r;
    });
    heya.rikishiIds = ids;
    heya.welfareState = {
      welfareRisk: 0,
      morale: 50,
      activeDiet: "maintenance",
      complianceState: "compliant",
      weeksInState: 0,
    };
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      rikishi: new Map(rikishi.map((r) => [r.id, r])),
      activeRikishiIds: new Set(ids),
    });

    const { delta } = calculateWeeklyWelfareDelta(world, heya, heya.welfareState!);
    expect(delta).toBeGreaterThan(0);
  });
});
