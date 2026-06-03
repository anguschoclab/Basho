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
  westOverrides: Partial<PhysicalBody> = {},
  phase: "push_battle" | "belt_battle" | "edge_crisis" = "push_battle"
): EngineStateV2 {
  return {
    tick: 10,
    phase: { tag: phase, state: makePushState() },
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
    // East near edge (positive side), west has uwate attacking with forward momentum
    const st = makeEngineState({ leadingFootX: 4.0 }, { leadingFootX: -0.7, velocityX: 2 });
    const belt = makeBeltState({ westGripClass: "uwate", eastGripClass: "none" });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result).not.toBeNull();
    expect(result?.technique).toBe("yorikiri");
    expect(result?.side).toBe("west"); // west is attacking
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.8);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97); // clamped by technique bonus
  });

  it("returns yorikiri with highest prob when attacker has morozashi", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // West attacks east near east edge — morozashi grip, west pushing forward
    const st = makeEngineState({ leadingFootX: 4.0 }, { leadingFootX: -0.7, velocityX: 2 });
    const belt = makeBeltState({ westGripClass: "morozashi", eastGripClass: "none" });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("yorikiri");
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.8);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns oshidashi when defender near edge with no belt grip", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // East near edge, west pushing forward (no grip)
    const st = makeEngineState({ leadingFootX: 4.1 }, { leadingFootX: -0.7, velocityX: 2 });
    const belt = makeBeltState({ eastGripClass: "none", westGripClass: "none" });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    // No belt grip → oshidashi (west pushes east out)
    expect(result?.technique).toBe("oshidashi");
    expect(result?.side).toBe("west");
  });

  it("returns okuridashi when defender near edge and not fighting back", () => {
    // yotsu style: oshidashi (requires isPusher/oshi) can't fire, only okuridashi
    const east = mockRikishi("r1", { style: "yotsu" });
    const west = mockRikishi("r2");
    const st = makeEngineState(
      { leadingFootX: 4.1, velocityX: 3 }, // east pushing with high momentum
      { leadingFootX: -4.1 } // west near edge, velocityX=0 = retreating
    );

    const result = evaluateKimariteAttempt(east, west, null, null, st, mockRng);

    expect(result?.technique).toBe("okuridashi");
    expect(result?.side).toBe("east");
  });
});

// ---------------------------------------------------------------------------
// Belt kimarite classification
// ---------------------------------------------------------------------------

describe("evaluateKimariteAttempt — belt battle", () => {
  it("returns uwatenage when attacker has morozashi and defender is falling", () => {
    // power: 65 so w.stats.power (65) > l.balanceResistance (50)
    // cogOffset: 0.6 → west.stats.balance = max(0, 100 - 0.6*200) = 0 → l.stats.balance <= 0
    const east = mockRikishi("r1", { power: 65 });
    const west = mockRikishi("r2");
    const st = makeEngineState({}, { cogOffset: 0.6, footSpread: 0.4 }, "belt_battle");
    const belt = makeBeltState({
      eastGripClass: "morozashi",
      torqueEast: 50,
      torqueWest: 10,
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("uwatenage");
    expect(result?.side).toBe("east");
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.6);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns uwatenage with uwate grip when defender is falling", () => {
    const east = mockRikishi("r1", { power: 65 });
    const west = mockRikishi("r2");
    const st = makeEngineState({}, { cogOffset: 0.6, footSpread: 0.4 }, "belt_battle");
    const belt = makeBeltState({
      eastGripClass: "uwate",
      torqueEast: 50,
      torqueWest: 10,
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("uwatenage");
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.6);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns shitatenage when west dominates torque and east is falling", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2", { power: 65 }); // west needs power > east.balanceResistance (50)
    const st = makeEngineState(
      { cogOffset: 0.6, footSpread: 0.4 }, // east falling: balance = 0
      {},
      "belt_battle"
    );
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
    // East near edge, west has uwate + forward velocity
    const st = makeEngineState({ leadingFootX: 3.6 }, { leadingFootX: -0.7, velocityX: 2 });
    const belt = makeBeltState({
      eastGripClass: "none",
      westGripClass: "uwate",
      torqueEast: 10,
      torqueWest: 15,
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("yorikiri");
    expect(result?.side).toBe("west");
  });

  it("returns yoritaoshi when opponent is falling with belt grip", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // West falling: cogOffset = 0.6 → balance = max(0, 100 - 120) = 0
    const st = makeEngineState(
      { velocityX: 2 }, // east pushing forward
      { cogOffset: 0.6, footSpread: 0.4 },
      "belt_battle"
    );
    const belt = makeBeltState({
      eastGripClass: "shitate",
      torqueEast: 15,
      torqueWest: 10,
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    expect(result?.technique).toBe("yoritaoshi");
    expect(result?.side).toBe("east");
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
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.8);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns oshitaoshi when opponent is falling with high momentum", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // West falling: cogOffset=0.6 → balance=max(0,100-120)=0 ≤ 0; east pushing, nearCenter (edgeDistance=3.85)
    const st = makeEngineState({ cogOffset: 0, velocityX: 5 }, { cogOffset: 0.6, footSpread: 0.4 });
    const push = makePushState({
      eastMomentum: 20,
      westMomentum: 5,
    });

    const result = evaluateKimariteAttempt(east, west, push, null, st, mockRng);

    expect(result?.technique).toBe("oshitaoshi");
    expect(result?.side).toBe("east");
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.8);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns tsukitaoshi when opponent is falling with low momentum", () => {
    // tsukitaoshi (line 118 in strategy array): noBelt && power>=65 && balance<=0 && nearCenter
    // Conditions to isolate tsukitaoshi as the FIRST applicable technique:
    //   - style="oshi" (default) prevents kotenage/koshihineri/sotogake and other style!="oshi" competitors
    //   - velocityX=0 on east prevents oshitaoshi (requires forwardMomentum>0)
    //   - tsukitaoshi (line 118) appears before sukuinage (line 342) in strategy array
    //   - firstRng returns 0 → roll=0 → always selects first applicable technique (tsukitaoshi)
    const east = mockRikishi("r1", { power: 65 }); // power>=65; style="oshi" by default
    const west = mockRikishi("r2");
    // West falling: cogOffset=0.6 → balance=max(0,100-120)=0; nearCenter (edgeDistance=3.85)
    // East has no velocityX (defaults to 0) → forwardMomentum=0 → oshitaoshi won't compete
    const st = makeEngineState({ cogOffset: 0 }, { cogOffset: 0.6, footSpread: 0.4 });
    const push = makePushState({
      eastMomentum: 8,
      westMomentum: 5,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstRng: any = { next: () => 0 }; // roll=0 → first applicable strategy wins

    const result = evaluateKimariteAttempt(east, west, push, null, st, firstRng);

    expect(result?.technique).toBe("tsukitaoshi");
    expect(result?.side).toBe("east");
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.7);
    expect(result?.successProbability).toBeLessThanOrEqual(0.97);
  });

  it("returns tsukidashi when pusher has high power and defender near edge", () => {
    // tsukidashi requires noBelt && power >= 65 && atEdge(l)
    const east = mockRikishi("r1", { power: 70 });
    const west = mockRikishi("r2");
    const st = makeEngineState({ velocityX: 5 }, { leadingFootX: -3.8 }); // west near edge
    const push = makePushState({
      contestLine: 3.0,
      eastMomentum: 20,
      westMomentum: 12,
      westLeadFoot: -3.8,
    });

    const result = evaluateKimariteAttempt(east, west, push, null, st, mockRng);

    expect(result?.technique).toBe("tsukidashi");
    expect(result?.side).toBe("east");
    expect(result?.successProbability).toBeGreaterThanOrEqual(0.6);
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
// Priority: weighted selection among applicable techniques
// ---------------------------------------------------------------------------

describe("evaluateKimariteAttempt — priority ordering", () => {
  it("yorikiri fires when both belt-throw and edge conditions are met (highest weight)", () => {
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    // East near edge AND west has uwate pushing forward
    const st = makeEngineState({ leadingFootX: 4.1 }, { leadingFootX: -0.7, velocityX: 2 });
    const belt = makeBeltState({
      westGripClass: "uwate",
      eastGripClass: "none",
      torqueEast: 5,
      torqueWest: 60,
    });

    const result = evaluateKimariteAttempt(east, west, null, belt, st, mockRng);

    // Yorikiri (weight 90) wins over other edge techniques
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
    // East near edge, west pushing with uwate
    const st = makeEngineState({ leadingFootX: 4.0 }, { leadingFootX: -0.7, velocityX: 2 });
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
