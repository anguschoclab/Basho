import { describe, it, expect } from "vitest";
import { evaluateKimariteAttempt } from "../kimariteClassifier";
import { mockRikishi } from "../../__tests__/utils";
import type {
  EngineStateV2,
  PushBattleState,
  BeltBattleState,
  PhysicalBody,
} from "../../types/combat-spatial";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRng: any = { next: () => 0.5 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBody(overrides: Partial<PhysicalBody> = {}): PhysicalBody {
  return {
    x: 0,
    z: 0,
    facingAngle: 0,
    mass: 150,
    cogHeight: 0.95,
    cogOffset: 0,
    footSpread: 0.4,
    leadingFootX: 0,
    velocityX: 0,
    velocityZ: 0,
    isFalling: false,
    boutFatigue: 0,
    ...overrides,
  };
}

function makeEngineState(
  eastOverrides: Partial<PhysicalBody> = {},
  westOverrides: Partial<PhysicalBody> = {}
): EngineStateV2 {
  return {
    tick: 10,
    phase: { tag: "push_battle", state: makePushState() },
    east: makeBody({ leadingFootX: 0.7, ...eastOverrides }),
    west: makeBody({ leadingFootX: -0.7, ...westOverrides }),
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
    tachiaiWinner: "east",
  };
}

function makePushState(overrides: Partial<PushBattleState> = {}): PushBattleState {
  return {
    contestLine: 0,
    eastForce: 60,
    westForce: 55,
    eastLeadFoot: 0.7,
    westLeadFoot: -0.7,
    eastMomentum: 5,
    westMomentum: 5,
    ...overrides,
  };
}

function makeBeltState(overrides: Partial<BeltBattleState> = {}): BeltBattleState {
  return {
    eastLeft: null,
    eastRight: {
      armReach: 0.12,
      isInside: true,
      leverArm: 0.28,
      gripStrength: 1.0,
      isBlocked: false,
    },
    westLeft: null,
    westRight: {
      armReach: 0.09,
      isInside: false,
      leverArm: 0.22,
      gripStrength: 0.9,
      isBlocked: false,
    },
    eastGripClass: "shitate",
    westGripClass: "outside",
    eastDepth: "standard",
    westDepth: "standard",
    torqueEast: 20,
    torqueWest: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Edge kimarite classification
// ---------------------------------------------------------------------------

describe("evaluateKimariteAttempt — edge conditions", () => {
  it("returns yorikiri when defender near edge and attacker has uwate grip", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // East near edge (positive side), west has uwate attacking
    const st = makeEngineState({ leadingFootX: 4.0 }, { leadingFootX: -0.7, velocityX: 2 });
    const belt = makeBeltState({ westGripClass: "uwate", eastGripClass: "none" });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result).not.toBeNull();
    expect(result?.technique).toBe("yorikiri");
    expect(result?.side).toBe("west"); // west is attacking
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.8);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97); // clamped by technique bonus
  });

  it("returns yorikiri with highest prob (0.92) when attacker has morozashi", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState({ leadingFootX: 4.0 }, { leadingFootX: -0.7 });
    const belt = makeBeltState({ westGripClass: "morozashi", eastGripClass: "none" });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("yorikiri");
    // Base prob 0.92 + technique bonus (clamped at 0.97)
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.92);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns oshidashi when defender near edge with no belt grip", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState({ leadingFootX: 4.1 }, { leadingFootX: -0.7 });
    const belt = makeBeltState({ eastGripClass: "none", westGripClass: "none" });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    // No belt grip → oshidashi fallback
    expect(result?.technique).toBe("oshidashi");
    expect(result?.side).toBe("west");
  });

  it("returns okuridashi when both fighters near edge", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // Both outside EDGE_THRESHOLD
    const st = makeEngineState(
      { leadingFootX: 4.1, velocityX: 3 },
      { leadingFootX: -4.1, velocityX: 1 }
    );

    const result = evaluateKimariteAttempt(east, west, null, null, st, mockRng);

    expect(result?.technique).toBe("okuridashi");
    // East has higher momentumX → east side
    expect(result?.side).toBe("east");
  });
});

// ---------------------------------------------------------------------------
// Belt kimarite classification
// ---------------------------------------------------------------------------

describe("evaluateKimariteAttempt — belt battle", () => {
  it("returns uwatenage on high torque advantage with morozashi grip", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState();
    const belt = makeBeltState({
      eastGripClass: "morozashi",
      torqueEast: 50,
      torqueWest: 10,
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("uwatenage");
    expect(result?.side).toBe("east");
    // Base prob 0.75 + technique bonus (clamped at 0.97)
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.75);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
    expect(result?.requiredConditions).toContain("morozashi_grip");
  });

  it("returns uwatenage with lower prob when attacker has uwate (not morozashi)", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState();
    const belt = makeBeltState({
      eastGripClass: "uwate",
      torqueEast: 50,
      torqueWest: 10,
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("uwatenage");
    // Base prob 0.6 + technique bonus (clamped at 0.97)
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.6);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns shitatenage on high torque with shitate grip", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState();
    const belt = makeBeltState({
      westGripClass: "shitate",
      torqueEast: 5,
      torqueWest: 40, // west dominates
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("shitatenage");
    expect(result?.side).toBe("west");
  });

  it("returns yorikiri when belt holder pushes defender near edge", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // East near edge, west has uwate
    const st = makeEngineState({ leadingFootX: 3.6 }, { leadingFootX: -0.7 });
    const belt = makeBeltState({
      eastGripClass: "none",
      westGripClass: "uwate",
      torqueEast: 10,
      torqueWest: 15, // not high enough for throw path (< 25)
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("yorikiri");
    expect(result?.side).toBe("west");
  });

  it("returns yoritaoshi when opponent is falling with belt grip", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // West falling: cogOffset > footSpread/2
    const st = makeEngineState(
      { cogOffset: 0.05, footSpread: 0.4 },
      { cogOffset: 0.25, footSpread: 0.4 } // 0.25 > 0.4/2 = 0.2 → falling
    );
    const belt = makeBeltState({
      eastGripClass: "shitate",
      torqueEast: 15,
      torqueWest: 10,
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("yoritaoshi");
    expect(result?.side).toBe("east"); // east wins since west is falling
    // Base prob 0.9 + technique bonus (clamped at 0.97)
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.9);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns null when belt is present but no decisive condition met", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState(); // both centered, not falling
    const belt = makeBeltState({
      eastGripClass: "shitate",
      westGripClass: "outside",
      torqueEast: 12,
      torqueWest: 10, // low torque diff
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Push kimarite classification
// ---------------------------------------------------------------------------

describe("evaluateKimariteAttempt — push battle", () => {
  it("returns oshidashi when pusher has momentum advantage and defender near edge", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState({ leadingFootX: 0.7, velocityX: 5 }, { leadingFootX: -3.6 });
    const push = makePushState({
      eastLeadFoot: 0.7,
      westLeadFoot: -3.6,
      eastMomentum: 20,
      westMomentum: 5, // momentum advantage > 10
    });

    const result = evaluateKimariteAttempt(east, west, push, null, st, mockRng);

    expect(result?.technique).toBe("oshidashi");
    expect(result?.side).toBe("east"); // east is the pusher
    // Base prob 0.8 + technique bonus (clamped at 0.97)
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.8);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns oshitaoshi when opponent is falling with high momentum", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // West falling (cogOffset > footSpread/2)
    const st = makeEngineState({ cogOffset: 0 }, { cogOffset: 0.25, footSpread: 0.4 });
    const push = makePushState({
      eastMomentum: 20, // > 15
      westMomentum: 5,
    });

    const result = evaluateKimariteAttempt(east, west, push, null, st, mockRng);

    expect(result?.technique).toBe("oshitaoshi");
    expect(result?.side).toBe("east");
    // Base prob 0.85 + technique bonus (clamped at 0.97)
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.85);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns tsukitaoshi when opponent is falling with low momentum", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // West falling
    const st = makeEngineState({ cogOffset: 0 }, { cogOffset: 0.25, footSpread: 0.4 });
    const push = makePushState({
      eastMomentum: 8, // <= 15
      westMomentum: 5,
    });

    const result = evaluateKimariteAttempt(east, west, push, null, st, mockRng);

    expect(result?.technique).toBe("tsukitaoshi");
    expect(result?.side).toBe("east");
    // Base prob 0.75 + technique bonus (clamped at 0.97)
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.75);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns tsukidashi on strong contest line advantage with momentum", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState();
    const push = makePushState({
      contestLine: 3.0, // > 2.5
      eastMomentum: 20,
      westMomentum: 12, // advantage > 5
    });

    const result = evaluateKimariteAttempt(east, west, push, null, st, mockRng);

    expect(result?.technique).toBe("tsukidashi");
    expect(result?.side).toBe("east");
    // Base prob 0.65 + technique bonus (clamped at 0.97)
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.65);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns null when no push conditions are met", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState(); // both centered, not falling
    const push = makePushState({
      contestLine: 0.5, // below threshold
      eastMomentum: 5,
      westMomentum: 4, // low advantage
    });

    const result = evaluateKimariteAttempt(east, west, push, null, st, mockRng);

    expect(result).toBeNull();
  });

  it("returns null when no push or belt state is given and center of ring", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState();

    const result = evaluateKimariteAttempt(east, west, null, null, st, mockRng);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Priority: edge check fires before belt/push
// ---------------------------------------------------------------------------

describe("evaluateKimariteAttempt — priority ordering", () => {
  it("edge condition fires before belt throw condition", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // East near edge AND high torque advantage (both conditions present)
    const st = makeEngineState({ leadingFootX: 4.1 }, { leadingFootX: -0.7 });
    const belt = makeBeltState({
      westGripClass: "uwate",
      eastGripClass: "none",
      torqueEast: 5,
      torqueWest: 60, // would trigger shitatenage if belt path ran first
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    // Edge path fires first → yorikiri (not shitatenage)
    expect(result?.technique).toBe("yorikiri");
  });
});

// ---------------------------------------------------------------------------
// KimariteAttempt shape validation
// ---------------------------------------------------------------------------

describe("evaluateKimariteAttempt — result shape", () => {
  it("returned attempt has required fields", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const st = makeEngineState({ leadingFootX: 4.0 }, { leadingFootX: -0.7 });
    const belt = makeBeltState({ westGripClass: "uwate", eastGripClass: "none" });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result).not.toBeNull();
    expect(typeof result?.technique).toBe("string");
    expect(["east", "west"]).toContain(result?.side);
    expect(result?.successProbability).toBeGreaterThan(0);
    expect(result?.successProbability).toBeLessThanOrEqual(1);
    expect(Array.isArray(result?.requiredConditions)).toBe(true);
    expect(result?.requiredConditions.length ?? 0).toBeGreaterThan(0);
  });
});
