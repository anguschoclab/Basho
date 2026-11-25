import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import {
  transitionToSanctioned,
  handleSanctionedTransition,
  handleInvestigationTransition,
} from "@/engine/tick/phases/welfare/transitions";
import type { WelfareState } from "@/engine/types/economy";

/**
 * Purity coverage for welfare transition handlers: they run inside a "pure"
 * pipeline phase, so all writes must go through the ImpactBuilder — never
 * mutate the input heya/state objects in place.
 */
function makeState(overrides: Partial<WelfareState> = {}): WelfareState {
  return {
    welfareRisk: 80,
    complianceState: "watch",
    weeksInState: 3,
    lastReviewedWeek: 0,
    activeDiet: "maintenance",
    morale: 50,
    ...overrides,
  } as WelfareState;
}

describe("welfare transitions — impact purity", () => {
  it("transitionToSanctioned routes the fine through updateHeya, not in-place mutation", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("h1", { funds: 20_000_000 });
    const state = makeState();
    const builder = createImpactBuilder("test");
    const pressure: Record<string, number> = {};

    transitionToSanctioned(world, heya, state, builder, pressure, []);

    expect(heya.funds).toBe(20_000_000); // input untouched
    const update = builder.build().entities?.heyaUpdates?.get("h1") as
      { funds?: number } | undefined;
    expect(update?.funds).toBeLessThan(20_000_000);
  });

  it("handleSanctionedTransition does not mutate the shared sanctions object", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("h1", { funds: 20_000_000 });
    const sanctions = { recruitmentFreezeWeeks: 2 } as WelfareState["sanctions"];
    const state = makeState({ complianceState: "sanctioned", sanctions });
    const nextState = { ...state }; // the phase's shallow clone shares nested sanctions
    const builder = createImpactBuilder("test");

    handleSanctionedTransition(world, heya, nextState, [], builder);

    expect(sanctions?.recruitmentFreezeWeeks).toBe(2); // original nested object untouched
    expect(nextState.sanctions?.recruitmentFreezeWeeks).toBe(1);
  });

  it("risk ≥85 with NO live violation holds at investigation — no recruitment death sentence", () => {
    // Regression: environmental channels (poor facilities, diet, recovery,
    // accumulated scandals) ratcheted risk past 85 and sanctioned ~90% of
    // heyas, freezing the whole intake pipeline (25-yr run: population
    // 665→205). Sanction now requires a live violation — serious injury,
    // negligence, or an actively scandal-plagued stable.
    const world = makeMockWorld();
    const heya = makeMockHeya("h1", { funds: 20_000_000, scandalScore: 0 });
    const state = makeState({
      complianceState: "investigation",
      welfareRisk: 90,
      investigation: {
        openedWeek: 0,
        severity: "high",
        triggers: ["facilities"],
        progress: 10,
      },
    });
    const builder = createImpactBuilder("test");

    handleInvestigationTransition(world, heya, state, [], builder, {}, 0, [], false);

    expect(state.complianceState).toBe("investigation");
  });

  it("risk ≥85 WITH a live violation (scandal ≥50) still sanctions", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("h1", { funds: 20_000_000, scandalScore: 60 });
    const state = makeState({
      complianceState: "investigation",
      welfareRisk: 90,
      investigation: {
        openedWeek: 0,
        severity: "high",
        triggers: ["scandal"],
        progress: 10,
      },
    });
    const builder = createImpactBuilder("test");

    handleInvestigationTransition(world, heya, state, [], builder, {}, 0, [], false);

    expect(state.complianceState).toBe("sanctioned");
  });
});
