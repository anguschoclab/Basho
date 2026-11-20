import { describe, it, expect } from "vitest";
import { tickEdgeCrisis, buildEdgeCrisis } from "@/engine/bout/physics/edgeCrisis";
import { mockRikishi } from "@tests/unit/engine/utils";
import { SeededRNG } from "@/engine/core/rng";
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
  defenderFacingAngle: number
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

/** Rikishi carrying an explicit bodyTypeBehavior.edgeFinishBonus. */
function makeRikishiWithEdgeFinishBonus(id: string, edgeFinishBonus: number): Rikishi {
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
        edgeEscapeBonus: 0,
        beltTorqueBonus: 0,
        pushVelocityBonus: 0,
      },
      bodyTypeBehavior: {
        pushVelocityBonus: 0,
        lateralMovementBonus: 0,
        beltTorqueBonus: 0,
        tachiaiSpeedBonus: 0,
        edgeFinishBonus,
      },
    },
  });
}

describe("edgeCrisis edgeFinishBonus (P9 — Takerufuji edge-finishing theory)", () => {
  it("weak-finisher attacker (edgeFinishBonus -15) lets the defender escape more", () => {
    const crisisSide = "east" as const;
    // Marginal scenario: angularEscapePower = 0.1 * 50 = 5.0, totalPressure = 5.0
    // Neutral attacker: canEscape = true (5 >= 5)
    // Weak finisher (-15%): totalPressure = 4.25, defender escapes more often
    const defenderAngle = 0.1;
    const push = makePush(crisisSide);

    const defender = mockRikishi("defender");
    const neutralAttacker = makeRikishiWithEdgeFinishBonus("neutral", 0);
    const weakAttacker = makeRikishiWithEdgeFinishBonus("weak", -15);

    let neutralEscapes = 0;
    let weakEscapes = 0;
    const NUM_SEEDS = 200;

    for (let i = 0; i < NUM_SEEDS; i++) {
      const seed = `finish-test-${i}`;

      // crisisSide east → defender is east (arg 2), attacker is west (arg 3)
      const neutralState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const neutralRng = new SeededRNG(seed);
      const neutralResult = tickEdgeCrisis(neutralRng, defender, neutralAttacker, neutralState, []);
      if (neutralResult?.escaped) neutralEscapes++;

      const weakState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const weakRng = new SeededRNG(seed);
      const weakResult = tickEdgeCrisis(weakRng, defender, weakAttacker, weakState, []);
      if (weakResult?.escaped) weakEscapes++;
    }

    // A weak-finisher attacker loses edge conversions the neutral would hold.
    expect(weakEscapes).toBeGreaterThan(neutralEscapes);
  });

  it("strong-finisher attacker (edgeFinishBonus +15) holds the defender at the edge", () => {
    const crisisSide = "east" as const;
    // angularEscapePower = 0.11 * 50 = 5.5, totalPressure = 5.0
    // Neutral: canEscape = true (5.5 >= 5.0), escapeMargin = 0.5
    // Strong finisher (+15%): totalPressure = 5.75 → canEscape = false
    const defenderAngle = 0.11;
    const push = makePush(crisisSide);

    const defender = mockRikishi("defender");
    const neutralAttacker = makeRikishiWithEdgeFinishBonus("neutral", 0);
    const strongAttacker = makeRikishiWithEdgeFinishBonus("strong", 15);

    let neutralEscapes = 0;
    let strongEscapes = 0;
    const NUM_SEEDS = 200;

    for (let i = 0; i < NUM_SEEDS; i++) {
      const seed = `finish-test2-${i}`;

      const neutralState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const neutralRng = new SeededRNG(seed);
      const neutralResult = tickEdgeCrisis(neutralRng, defender, neutralAttacker, neutralState, []);
      if (neutralResult?.escaped) neutralEscapes++;

      const strongState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const strongRng = new SeededRNG(seed);
      const strongResult = tickEdgeCrisis(strongRng, defender, strongAttacker, strongState, []);
      if (strongResult?.escaped) strongEscapes++;
    }

    // Strong finisher converts edges the neutral attacker couldn't hold.
    expect(strongEscapes).toBeLessThan(neutralEscapes);
  });

  it("lanky body type derives a negative edge-finish bonus (more escapes allowed)", () => {
    const crisisSide = "east" as const;
    const defenderAngle = 0.1;
    const push = makePush(crisisSide);

    const defender = mockRikishi("defender");
    // Barrel-bodied attacker: heavy for height → strong drive-through
    const barrel = mockRikishi("barrel", { height: 175, weight: 170, bodyType: "barrel" });
    // Lanky attacker (Takerufuji archetype): thin legs, weak edge authority
    const lanky = mockRikishi("lanky", { height: 190, weight: 115, bodyType: "lanky" });

    let barrelEscapes = 0;
    let lankyEscapes = 0;
    const NUM_SEEDS = 200;

    for (let i = 0; i < NUM_SEEDS; i++) {
      const seed = `finish-body-${i}`;

      const barrelState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const barrelRng = new SeededRNG(seed);
      const barrelResult = tickEdgeCrisis(barrelRng, defender, barrel, barrelState, []);
      if (barrelResult?.escaped) barrelEscapes++;

      const lankyState = makeEngineState(crisisSide, { ...push }, defenderAngle);
      const lankyRng = new SeededRNG(seed);
      const lankyResult = tickEdgeCrisis(lankyRng, defender, lanky, lankyState, []);
      if (lankyResult?.escaped) lankyEscapes++;
    }

    // Skinny calves: the lanky attacker lets more edge escapes through.
    expect(lankyEscapes).toBeGreaterThan(barrelEscapes);
  });
});
