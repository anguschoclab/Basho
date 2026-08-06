 
import { describe, it, expect } from "vitest";
import { tickEdgeCrisis, buildEdgeCrisis } from "@/engine/bout/physics/edgeCrisis";
import { mockRikishi } from "../utils";
import { SeededRNG } from "@/engine/rng";
import { EDGE_THRESHOLD } from "@/engine/types/combat-spatial";
import type { EngineStateV2, PushBattleState, CombatPhase } from "@/engine/types/combat-spatial";
import type { Rikishi } from "@/engine/types/rikishi";

function makePhysicalBody(overrides: Partial<EngineStateV2["east"]> = {}) {
  return {
    x: 0,
    z: 0,
    facingAngle: 0,
    mass: 130,
    cogHeight: 1.0,
    cogOffset: 0,
    footSpread: 0.5,
    leadingFootX: 0,
    velocityX: 0,
    velocityZ: 0,
    isFalling: false,
    boutFatigue: 0,
    ...overrides,
  };
}

function makeEngineState(
  crisisSide: "east" | "west",
  push: PushBattleState,
  defenderFacingAngle: number,
): EngineStateV2 {
  const phase = buildEdgeCrisis(crisisSide, push, undefined, "push_battle", {
    east: makePhysicalBody({ facingAngle: crisisSide === "east" ? defenderFacingAngle : 0 }),
    west: makePhysicalBody({ facingAngle: crisisSide === "west" ? defenderFacingAngle : 0 }),
  } as unknown as EngineStateV2) as CombatPhase;

  return {
    tick: 5,
    phase,
    east: makePhysicalBody({ facingAngle: crisisSide === "east" ? defenderFacingAngle : 0 }),
    west: makePhysicalBody({ facingAngle: crisisSide === "west" ? defenderFacingAngle : 0 }),
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
    tachiaiWinner: "east",
    momentumScore: 0,
    prevDominantSide: null,
    inBoutInjury: null,
  };
}

function makePush(crisisSide: "east" | "west"): PushBattleState {
  return {
    contestLine: 0,
    eastForce: 50,
    westForce: 50,
    eastLeadFoot: crisisSide === "east" ? EDGE_THRESHOLD + 0.1 : 0,
    westLeadFoot: crisisSide === "west" ? -(EDGE_THRESHOLD + 0.1) : 0,
    eastMomentum: crisisSide === "west" ? 5.0 : 0,
    westMomentum: crisisSide === "east" ? 5.0 : 0,
    eastLateral: 0,
    westLateral: 0,
    eastLateralMomentum: 0,
    westLateralMomentum: 0,
  };
}

function makeRikishiWithEdgeEscapeBonus(
  id: string,
  edgeEscapeBonus: number,
): Rikishi {
  return mockRikishi(id, {
    combatProfile: {
      archetype: "hybrid",
      familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: {},
      counterFamily: "push",
      archetypeBehavior: {
        tachiaiSpeedBonus: 0,
        lateralMovementBonus: 0,
        edgeEscapeBonus,
        beltTorqueBonus: 0,
        pushVelocityBonus: 0,
      },
    },
  });
}

describe("edgeCrisis edgeEscapeBonus (2.1)", () => {
  it("defensive archetype (edgeEscapeBonus +15) has higher escape power than neutral", () => {
    const crisisSide = "east" as const;
    // Set up marginal scenario: angularEscapePower = 0.1 * 50 = 5.0, totalPressure = 5.0
    // Without bonus: canEscape = true (5 >= 5), escapeMargin = 0
    // With +15% bonus: angularEscapePower = 5.75, escapeMargin = 0.75
    const defenderAngle = 0.1;
    const push = makePush(crisisSide);

    const neutralRikishi = makeRikishiWithEdgeEscapeBonus("neutral", 0);
    const defensiveRikishi = makeRikishiWithEdgeEscapeBonus("defensive", 15);
    const opponent = mockRikishi("opponent");

    // Use SAME seed for each pair so only edgeEscapeBonus differs
    let neutralEscapes = 0;
    let defensiveEscapes = 0;
    const NUM_SEEDS = 200;

    for (let i = 0; i < NUM_SEEDS; i++) {
      const seed = `escape-test-${i}`;

      const neutralState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const neutralRng = new SeededRNG(seed);
      const neutralResult = tickEdgeCrisis(neutralRng, neutralRikishi, opponent, neutralState, []);
      if (neutralResult?.escaped) neutralEscapes++;

      const defensiveState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const defensiveRng = new SeededRNG(seed);
      const defensiveResult = tickEdgeCrisis(defensiveRng, defensiveRikishi, opponent, defensiveState, []);
      if (defensiveResult?.escaped) defensiveEscapes++;
    }

    // Defensive should escape significantly more often than neutral
    expect(defensiveEscapes).toBeGreaterThan(neutralEscapes);
  });

  it("tsuppari archetype (edgeEscapeBonus -10) has lower escape power than neutral", () => {
    const crisisSide = "east" as const;
    const defenderAngle = 0.1;
    const push = makePush(crisisSide);

    const neutralRikishi = makeRikishiWithEdgeEscapeBonus("neutral", 0);
    const tsuppariRikishi = makeRikishiWithEdgeEscapeBonus("tsuppari", -10);
    const opponent = mockRikishi("opponent");

    let neutralEscapes = 0;
    let tsuppariEscapes = 0;
    const NUM_SEEDS = 200;

    for (let i = 0; i < NUM_SEEDS; i++) {
      const seed = `escape-test2-${i}`;

      const neutralState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const neutralRng = new SeededRNG(seed);
      const neutralResult = tickEdgeCrisis(neutralRng, neutralRikishi, opponent, neutralState, []);
      if (neutralResult?.escaped) neutralEscapes++;

      const tsuppariState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const tsuppariRng = new SeededRNG(seed);
      const tsuppariResult = tickEdgeCrisis(tsuppariRng, tsuppariRikishi, opponent, tsuppariState, []);
      if (tsuppariResult?.escaped) tsuppariEscapes++;
    }

    // Tsuppari should escape less often than neutral
    expect(tsuppariEscapes).toBeLessThan(neutralEscapes);
  });

  it("edgeEscapeBonus is applied to escape power, not just probability", () => {
    // In a scenario where neutral canEscape is false (angularEscapePower < totalPressure),
    // a high edgeEscapeBonus should flip canEscape to true
    const crisisSide = "east" as const;
    // angularEscapePower = 0.095 * 50 = 4.75, totalPressure = 5.0
    // Neutral: canEscape = false (4.75 < 5.0)
    // Defensive (+15%): angularEscapePower = 4.75 * 1.15 = 5.46, canEscape = true (5.46 >= 5.0)
    const defenderAngle = 0.095;
    const push = makePush(crisisSide);

    const defensiveRikishi = makeRikishiWithEdgeEscapeBonus("defensive", 15);
    const opponent = mockRikishi("opponent");

    let defensiveCanEscape = 0;
    const NUM_SEEDS = 100;

    for (let i = 0; i < NUM_SEEDS; i++) {
      const state = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const rng = new SeededRNG(`escape-flip-${i}`);
      const result = tickEdgeCrisis(rng, defensiveRikishi, opponent, state, []);
      if (result?.escaped) defensiveCanEscape++;
    }

    // With the bonus flipping canEscape to true, defensive should escape sometimes
    expect(defensiveCanEscape).toBeGreaterThan(0);
  });
});
