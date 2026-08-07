import { describe, it, expect } from "vitest";
import { phase01_daily_economy } from "../../../../../engine/tick/phases/phase01_daily_economy";
import { MockFactory } from "../../../../helpers/utils/MockFactory";
import { DIET_COSTS, DEBT_LIMIT } from "../../../../../constants/engine/economic";
import { resolveImpacts } from "../../../../../engine/core/ImpactResolver";

describe("phase01_daily_economy", () => {
  it("deducts food costs for heyas with rikishi based on active diet", () => {
    const world = MockFactory.createWorld();
    world.heyas = new Map();

    // Setup Heya A: 2 Rikishi, maintenance diet
    world.heyas.set("heyaA", {
      id: "heyaA",
      name: "Heya A",
      funds: 100000,
      rikishiIds: ["r1", "r2"],
      welfareState: { activeDiet: "maintenance" } as any,
    } as any);

    // Setup Heya B: 1 Rikishi, premium diet
    world.heyas.set("heyaB", {
      id: "heyaB",
      name: "Heya B",
      funds: 100000,
      rikishiIds: ["r3"],
      welfareState: { activeDiet: "premium" } as any,
    } as any);

    // Setup Heya C: No Rikishi, should not be deducted
    world.heyas.set("heyaC", {
      id: "heyaC",
      name: "Heya C",
      funds: 100000,
      rikishiIds: [],
      welfareState: { activeDiet: "premium" } as any,
    } as any);

    const impact = phase01_daily_economy(world);
    const updatedState = resolveImpacts(world, [impact]);

    expect(updatedState.heyas.get("heyaA")?.funds).toBe(100000 - 2 * DIET_COSTS["maintenance"]);
    expect(updatedState.heyas.get("heyaB")?.funds).toBe(100000 - 1 * DIET_COSTS["premium"]);
    expect(updatedState.heyas.get("heyaC")?.funds).toBe(100000);
  });

  it("does not deduct below debt limit", () => {
    const world = MockFactory.createWorld();
    world.heyas = new Map();
    const nearDebtFunds = DEBT_LIMIT + 10;

    world.heyas.set("heyaA", {
      id: "heyaA",
      name: "Heya A",
      funds: nearDebtFunds,
      rikishiIds: ["r1"],
      welfareState: { activeDiet: "premium" } as any,
    } as any);

    const impact = phase01_daily_economy(world);
    const updatedState = resolveImpacts(world, [impact]);

    expect(updatedState.heyas.get("heyaA")?.funds).toBe(DEBT_LIMIT);
  });

  it("updates transientContext expenses if present", () => {
    const world = MockFactory.createWorld();
    world.heyas = new Map();

    world.transientContext = {
      deltas: {
        revenue: 0,
        expenses: 50,
        statChanges: {},
        injuriesSustained: []
      }
    } as any;

    world.heyas.set("heyaA", {
      id: "heyaA",
      name: "Heya A",
      funds: 100000,
      rikishiIds: ["r1"],
      welfareState: { activeDiet: "maintenance" } as any,
    } as any);

    const impact = phase01_daily_economy(world);
    const updatedState = resolveImpacts(world, [impact]);

    expect(updatedState.transientContext?.deltas.expenses).toBe(50 + DIET_COSTS["maintenance"] * 1);
  });
});
