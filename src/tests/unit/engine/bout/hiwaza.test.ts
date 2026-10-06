import { describe, it, expect } from "vitest";
import { classifyHiwaza, maybeClassifyHiwaza } from "@/engine/bout/hiwaza";
import { mockRikishi } from "../utils";
import type { EngineStateV2, PhysicalBody, PushBattleState } from "@/engine/types/combat-spatial";

/**
 * Hi_waza are the five "non-technique" winning results — the loser defeats
 * themselves (slips, collapses, steps out) without a decisive technique from
 * the winner:
 *   isamiashi    — over-eager step-out at the edge
 *   koshikudake  — hip collapse from exhaustion
 *   tsukite      — hand touches the clay
 *   tsukihiza    — knee touches the clay
 *   fumidashi    — steps out under own momentum
 *
 * They are classified from the loser's physical state at resolution.
 */

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

function makeState(east: Partial<PhysicalBody>, west: Partial<PhysicalBody>): EngineStateV2 {
  return {
    tick: 10,
    phase: { tag: "push_battle", state: {} as PushBattleState },
    east: makeBody(east),
    west: makeBody(west),
    tachiaiWinner: "east",
    momentumScore: 0,
    prevDominantSide: null,
    inBoutInjury: null,
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
  };
}

const rng = { next: () => 0.5 } as never;

describe("classifyHiwaza", () => {
  it("returns koshikudake when the loser collapses with exhausted stamina", () => {
    // |cogOffset| 0.6 > footSpread/2 0.2 → body is falling; stamina < 20
    const east = mockRikishi("e");
    const west = mockRikishi("w", { stamina: 5 });
    const st = makeState({}, { cogOffset: 0.6 });
    expect(classifyHiwaza("east", east, west, st, rng)).toBe("koshikudake");
  });

  it("returns tsukihiza when the loser collapses with low stamina", () => {
    const east = mockRikishi("e");
    const west = mockRikishi("w", { stamina: 30 });
    const st = makeState({}, { cogOffset: 0.6 });
    expect(classifyHiwaza("east", east, west, st, rng)).toBe("tsukihiza");
  });

  it("returns tsukite when the loser touches down with stamina intact", () => {
    const east = mockRikishi("e");
    const west = mockRikishi("w", { stamina: 80 });
    const st = makeState({}, { cogOffset: 0.6 });
    expect(classifyHiwaza("east", east, west, st, rng)).toBe("tsukite");
  });

  it("returns fumidashi when the loser drifts out at low speed", () => {
    // East loser: at the edge (leadingFootX 4.0 >= EDGE_THRESHOLD 3.8)
    // and still moving toward their own edge, but below the charge-out
    // speed threshold — a plain step-out, not an over-eager charge.
    const east = mockRikishi("e");
    const west = mockRikishi("w");
    const st = makeState({ leadingFootX: 4.0, velocityX: 1 }, {});
    expect(classifyHiwaza("west", east, west, st, rng)).toBe("fumidashi");
  });

  it("returns isamiashi when the loser charges themselves out", () => {
    // Over-eager attacker's exit: west loser at -4.0 still carrying real
    // outward speed (|velocityX| >= 2) → charged themselves past the tawara.
    const east = mockRikishi("e");
    const west = mockRikishi("w");
    const st = makeState({ leadingFootX: 3.9 }, { leadingFootX: -4.0, velocityX: -3 });
    expect(classifyHiwaza("east", east, west, st, rng)).toBe("isamiashi");
  });

  it("returns null for a clean contested finish", () => {
    const east = mockRikishi("e");
    const west = mockRikishi("w");
    const st = makeState({ velocityX: -2 }, { velocityX: 0.5 });
    expect(classifyHiwaza("east", east, west, st, rng)).toBeNull();
  });
});

describe("maybeClassifyHiwaza", () => {
  it("respects the probability gate (no reclassification when roll fails)", () => {
    const east = mockRikishi("e");
    const west = mockRikishi("w", { stamina: 5 });
    const st = makeState({}, { cogOffset: 0.6 });
    // rng.next() = 0.99 > any plausible gate → null even though the state qualifies
    const highRng = { next: () => 0.99 } as never;
    expect(maybeClassifyHiwaza("east", east, west, st, highRng)).toBeNull();
  });

  it("reclassifies when the gate passes and the state qualifies", () => {
    const east = mockRikishi("e");
    const west = mockRikishi("w", { stamina: 5 });
    const st = makeState({}, { cogOffset: 0.6 });
    const lowRng = { next: () => 0 } as never;
    expect(maybeClassifyHiwaza("east", east, west, st, lowRng)).toBe("koshikudake");
  });
});
