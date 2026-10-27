/**
 * physicsFixes.test.ts — regression tests for five bout physics/kimarite bugs:
 *
 *  1. counterActivated compared counterFamily to itself (dead logic)
 *  2. attacker.stats?.technique ?? attacker.stats.technique ?? 50 — dead
 *     fallback that threw TypeError before reaching the default
 *  3. rollWeightedSelection picked weighted[0] when every weight was 0
 *  4. timeout/resolved bouts mislabeled (240s cap + belt-dominant stance)
 *  5. mid-fight kimarite argmax always favored the better technician
 */
import { describe, it, expect, vi } from "vitest";
import { mockRikishi, makeMockBasho } from "@/tests/unit/engine/utils";
import { buildBoutResultV2 } from "@/engine/bout/physics/resultBuilders";
import { initEngineStateV2 } from "@/engine/bout/physics/initState";
import { resolveBoutPhysics } from "@/engine/bout/boutPhysics";
import { isBodyFalling } from "@/engine/bout/boutSpatial";
import { skillTieBreak } from "@/engine/bout/boutUtils";
import { KimariteSelectionEngine } from "@/engine/bout/KimariteSelectionEngine";
import { SeededRNG } from "@/engine/rng";
import type {
  EngineStateV2,
  PushBattleState,
  SpatialBoutContext,
  PhysicalBody,
} from "@/engine/types/combat-spatial";
import type { CombatProfile } from "@/engine/types/combat";

// ── Strategy mocks: two fake techniques — one with a real share target, one
// with none (zero selection weight). Both have always-true conditions.
// (Defined inside the hoisted factory — see vitest vi.mock docs.) ────────────

vi.mock("@/engine/kimariteStrategies", async (importOriginal) => {
  const orig =
    await importOriginal<typeof import("@/engine/kimariteStrategies")>();
  const TESTWAZA = {
    id: "testwaza",
    name: "Test Waza",
    category: "nage",
    weight: 10,
    difficulty: 5,
    appliesTo: ["push_battle", "belt_battle", "edge_crisis"],
    condition: () => true,
  };
  const DEADWAZA = {
    id: "deadwaza",
    name: "Dead Waza",
    category: "kihon",
    weight: 10,
    difficulty: 5,
    appliesTo: ["edge_crisis"],
    condition: () => true,
  };
  return { ...orig, KIMARITE_STRATEGIES: [TESTWAZA, DEADWAZA] };
});

vi.mock("@/constants/engine/kimariteFrequencies", async (importOriginal) => {
  const orig =
    await importOriginal<typeof import("@/constants/engine/kimariteFrequencies")>();
  return {
    ...orig,
    KIMARITE_FREQUENCY_TARGETS: { testwaza: 0.5 },
  };
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const BOUT = { id: "b1", day: 1, rikishiEastId: "e1", rikishiWestId: "w1" };

function combatProfile(overrides: Partial<CombatProfile> = {}): CombatProfile {
  return {
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
    ...overrides,
  };
}

function pushPhase(
  eastForce = 60,
  westForce = 40
): Extract<EngineStateV2["phase"], { tag: "push_battle" }> {
  return {
    tag: "push_battle",
    state: {
      contestLine: 0,
      eastForce,
      westForce,
      eastLeadFoot: 0,
      westLeadFoot: 0,
      eastMomentum: 0,
      westMomentum: 0,
      eastLateral: 0,
      westLateral: 0,
      eastLateralMomentum: 0,
      westLateralMomentum: 0,
    } as PushBattleState,
  };
}

const CTX: SpatialBoutContext = {
  eastLeadFoot: 0,
  westLeadFoot: 0,
  eastCoGOffset: 0,
  westCoGOffset: 0,
  eastMomentumX: 0,
  westMomentumX: 0,
  eastGrip: "none",
  westGrip: "none",
  torqueDiff: 0,
  atEdge: false,
  lateralOffsetDiff: 0,
  engagementAngle: 0,
  angularAdvantage: 0,
};

// ── 1. counterActivated ─────────────────────────────────────────────────────

describe("counterActivated — counters the opponent's dominant family, not itself", () => {
  it("is false when both sides share a counterFamily irrelevant to their styles", () => {
    // Both counter "push" but both play belt-dominant — nobody's counter
    // matches the opponent's actual game. (Buggy version compared
    // counterFamily === counterFamily and returned true.)
    const prof = combatProfile({
      counterFamily: "push",
      familyPreferences: { push: 5, belt: 45, trick: 25, speed: 25 },
    });
    const east = mockRikishi("e1", { combatProfile: prof });
    const west = mockRikishi("w1", { combatProfile: prof });
    const st = initEngineStateV2(BOUT, east, west);
    const result = buildBoutResultV2(BOUT, east, west, st, "east", "yorikiri", [], false);
    expect(result.archetypeMatchup?.counterActivated).toBe(false);
  });

  it("is true when a side's counterFamily matches the opponent's dominant family", () => {
    // east counters "push"; west is push-dominant → counter activated.
    const east = mockRikishi("e1", {
      combatProfile: combatProfile({
        counterFamily: "push",
        familyPreferences: { push: 5, belt: 45, trick: 25, speed: 25 },
      }),
    });
    const west = mockRikishi("w1", {
      combatProfile: combatProfile({
        counterFamily: "belt",
        familyPreferences: { push: 45, belt: 5, trick: 25, speed: 25 },
      }),
    });
    const st = initEngineStateV2(BOUT, east, west);
    const result = buildBoutResultV2(BOUT, east, west, st, "east", "oshidashi", [], false);
    expect(result.archetypeMatchup?.counterActivated).toBe(true);
  });
});

// ── 2 + 3. dead stats fallback & zero-weight selection ──────────────────────

describe("KimariteSelectionEngine edge cases", () => {
  it("does not crash when the attacker has no stats object", () => {
    const east = mockRikishi("e-nostats");
    delete (east as { stats?: unknown }).stats;
    const west = mockRikishi("w1", { technique: 60 });
    const st = initEngineStateV2(BOUT, east, west);
    st.phase = pushPhase();

    // Previously: TypeError inside computeSuccessProbability before the
    // `?? 50` fallback could fire.
    let attempt: ReturnType<typeof KimariteSelectionEngine.evaluate> = null;
    expect(() => {
      attempt = KimariteSelectionEngine.evaluate(
        east,
        west,
        st,
        CTX,
        "makuuchi",
        undefined,
        new SeededRNG("nostats")
      );
    }).not.toThrow();
    void attempt;
  });

  it("returns null when every applicable strategy has zero selection weight", () => {
    // edge_crisis state → only deadwaza applies, and deadwaza has no
    // frequency target → totalWeight 0 → must not deterministically pick
    // the first strategy.
    const east = mockRikishi("e1", { technique: 60 });
    const west = mockRikishi("w1", { technique: 60 });
    const st = initEngineStateV2(BOUT, east, west);
    st.phase = {
      tag: "edge_crisis",
      crisis: {
        side: "east",
        ticksInCrisis: 0,
        recoveryProbability: 0,
        tawaraToePosition: 0,
        tawaraBounceForce: 0,
        escapeAngle: 0,
        escapeForceAvailable: 0,
        opponentPressureX: 0,
        opponentPressureZ: 0,
        escaped: false,
      },
      prev: "push_battle",
      savedPush: pushPhase(60, 40).state as PushBattleState,
    };

    const attempt = KimariteSelectionEngine.evaluate(
      east,
      west,
      st,
      CTX,
      "makuuchi",
      undefined,
      new SeededRNG("zero-weight")
    );
    expect(attempt).toBeNull();
  });
});

// ── 4. timeout / resolved labels ────────────────────────────────────────────

describe("timeout & resolved-phase honesty", () => {
  it("matched pairs converge to falls — stalemates stay rare and flagged", () => {
    // Identical bodies in a symmetric duel. Before the fatigue→instability
    // coupling, 36% of these hit the cap; the coupling should keep the rate
    // well under a fifth. Any timeout that does occur must carry the flag
    // and the cap duration so stats can exclude it honestly.
    let timeouts = 0;
    for (let i = 0; i < 50; i++) {
      const bout = { id: `to-${i}`, day: 1, rikishiEastId: `te-${i}`, rikishiWestId: `tw-${i}` };
      const { result } = resolveBoutPhysics(
        bout,
        mockRikishi(`te-${i}`),
        mockRikishi(`tw-${i}`),
        makeMockBasho()
      );
      if (result.isTimeout) {
        timeouts++;
        expect(result.duration).toBe(240);
      }
    }
    expect(timeouts).toBeLessThanOrEqual(10);
  });

  it("labels resolved-phase stance from the kimarite family, not a blanket belt tag", () => {
    const east = mockRikishi("e1");
    const west = mockRikishi("w1");
    const st = initEngineStateV2(BOUT, east, west);
    // A tachiai-resolved (henka) finish with a push-family technique —
    // previously reported "belt-dominant" because "resolved" mapped to belt.
    st.phase = {
      tag: "resolved",
      winner: "east",
      exitVector: { x: 1, z: 0 },
      technique: "oshidashi",
    };
    const result = buildBoutResultV2(BOUT, east, west, st, "east", "oshidashi", [], false);
    expect(result.stance).toBe("push-dominant");
  });
});

// ── 5. mid-fight kimarite side selection ────────────────────────────────────

describe("mid-fight attempt selection is weighted, not argmax", () => {
  it("lets the weaker technician's attempt win a nonzero share", () => {
    const east = mockRikishi("e1", { technique: 70 });
    const west = mockRikishi("w1", { technique: 30 });
    const st = initEngineStateV2(BOUT, east, west);
    st.phase = pushPhase();

    let westWins = 0;
    let attempts = 0;
    for (let i = 0; i < 500; i++) {
      const attempt = KimariteSelectionEngine.evaluate(
        east,
        west,
        st,
        CTX,
        "makuuchi",
        undefined,
        new SeededRNG(`bias-${i}`)
      );
      if (!attempt) continue;
      attempts++;
      if (attempt.side === "west") westWins++;
    }
    expect(attempts).toBeGreaterThan(0);
    // argmax gives west 0%; weighted-by-probability gives a real share.
    expect(westWins).toBeGreaterThan(0);
  });
});

// ── Skill-driven tie-breaks — ambiguous outcomes resolve on stats ───────────

describe("skillTieBreak — skill decides ambiguous outcomes, not position", () => {
  it("awards the higher-stat side every time", () => {
    const east = mockRikishi("e1", { technique: 80, balance: 40 });
    const west = mockRikishi("w1", { technique: 30, balance: 90 });
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(`tb-${i}`);
      expect(skillTieBreak(east, west, "technique", rng)).toBe("east");
      expect(skillTieBreak(east, west, "balance", rng)).toBe("west");
    }
  });

  it("falls back to a seeded coin when the stat is equal — no positional default", () => {
    const east = mockRikishi("e1", { technique: 50 });
    const west = mockRikishi("w1", { technique: 50 });
    let eastWins = 0;
    for (let i = 0; i < 200; i++) {
      if (skillTieBreak(east, west, "technique", new SeededRNG(`eq-${i}`)) === "east") eastWins++;
    }
    // ~50% split — not a hard east default.
    expect(eastWins).toBeGreaterThan(60);
    expect(eastWins).toBeLessThan(140);
  });

  it("is deterministic for the same seed", () => {
    const east = mockRikishi("e1", { technique: 50 });
    const west = mockRikishi("w1", { technique: 50 });
    for (const seed of ["d1", "d2", "d3"]) {
      const a = skillTieBreak(east, west, "technique", new SeededRNG(seed));
      const b = skillTieBreak(east, west, "technique", new SeededRNG(seed));
      expect(a).toBe(b);
    }
  });
});


// ── Fatigue → instability coupling (stalemate convergence) ──────────────────

describe("isBodyFalling — fatigue erodes effective foot spread", () => {
  function body(boutFatigue: number): PhysicalBody {
    return {
      x: 0,
      z: 0,
      facingAngle: 0,
      mass: 150,
      cogHeight: 1,
      cogOffset: 0.3,
      footSpread: 1.0,
      leadingFootX: 0,
      velocityX: 0,
      velocityZ: 0,
      isFalling: false,
      boutFatigue,
    };
  }

  it("a fresh fighter at the same offset is stable while a spent one falls", () => {
    // footSpread 1.0 → raw maxOffset 0.5; cogOffset 0.3 is stable when fresh.
    expect(isBodyFalling(body(0))).toBe(false);
    // Heavy bout fatigue must shrink the effective spread enough that the
    // same 0.3 offset becomes a fall — otherwise matched pairs grind to the
    // 120-tick cap forever.
    expect(isBodyFalling(body(120))).toBe(true);
  });
});
