/**
 * Tests for boutCanvas/animation.ts — getTargetState, lerpState, and the
 * pure arc/pose helpers extracted for testability.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import {
  getTargetState,
  lerpState,
  computeArcProgress,
  computeArcHeight,
  getLoserBodyPhase,
  getWinnerBodyPhase,
} from "@/components/game/boutReplay/boutCanvas/animation";
import type { BoutScript } from "@/engine/bout/ReplayMetadata";
import type { RikishiState } from "@/components/game/boutReplay/boutCanvas/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScript(family: BoutScript["family"], winnerSide: "east" | "west" = "east"): BoutScript {
  return {
    family,
    winnerSide,
    tachiaiMargin: 0.5,
    hasBeltBattle: false,
    hasEdgeCrisisEscape: false,
    isSpeedBout: family === "pull",
  };
}

function makeState(overrides: Partial<RikishiState> = {}): RikishiState {
  return {
    pos: { x: 0.5, y: 0.5 },
    rotation: 0,
    scale: 1,
    bodyPhase: "standing",
    opacity: 1,
    ...overrides,
  };
}

const ALL_FAMILIES: BoutScript["family"][] = [
  "force_out",
  "throw",
  "pull",
  "lift",
  "trip",
  "generic",
];

// ---------------------------------------------------------------------------
// getTargetState — finish phase family-specific behavior
// ---------------------------------------------------------------------------

describe("getTargetState — finish phase", () => {
  it("force_out: winner gripping, loser falling, no arc", () => {
    const script = makeScript("force_out", "east");
    const { east: winner, west: loser } = getTargetState("finish", 1, "east", script);
    expect(winner.bodyPhase).toBe("gripping");
    expect(loser.bodyPhase).toBe("falling");
    expect(loser.arcHeight).toBeUndefined();
    expect(loser.arcProgress).toBeUndefined();
  });

  it("throw: winner gripping, loser thrown, arcHeight 0.12, arcProgress 1.0", () => {
    const script = makeScript("throw", "east");
    const { east: winner, west: loser } = getTargetState("finish", 1, "east", script);
    expect(winner.bodyPhase).toBe("gripping");
    expect(loser.bodyPhase).toBe("thrown");
    expect(loser.arcHeight).toBeCloseTo(0.12, 10);
    expect(loser.arcProgress).toBe(1.0);
  });

  it("pull: winner pushing, loser thrown, no arc", () => {
    const script = makeScript("pull", "east");
    const { east: winner, west: loser } = getTargetState("finish", 1, "east", script);
    expect(winner.bodyPhase).toBe("pushing");
    expect(loser.bodyPhase).toBe("thrown");
    expect(loser.arcHeight).toBeUndefined();
    expect(loser.arcProgress).toBeUndefined();
  });

  it("lift: winner gripping, loser thrown, arcHeight 0.09, arcProgress 1.0", () => {
    const script = makeScript("lift", "east");
    const { east: winner, west: loser } = getTargetState("finish", 1, "east", script);
    expect(winner.bodyPhase).toBe("gripping");
    expect(loser.bodyPhase).toBe("thrown");
    expect(loser.arcHeight).toBeCloseTo(0.09, 10);
    expect(loser.arcProgress).toBe(1.0);
  });

  it("trip: winner throwing, loser falling, no arc", () => {
    const script = makeScript("trip", "east");
    const { east: winner, west: loser } = getTargetState("finish", 1, "east", script);
    expect(winner.bodyPhase).toBe("throwing");
    expect(loser.bodyPhase).toBe("falling");
    expect(loser.arcHeight).toBeUndefined();
  });

  it("generic: winner throwing, loser falling, no arc", () => {
    const script = makeScript("generic", "east");
    const { east: winner, west: loser } = getTargetState("finish", 1, "east", script);
    expect(winner.bodyPhase).toBe("throwing");
    expect(loser.bodyPhase).toBe("falling");
    expect(loser.arcHeight).toBeUndefined();
  });

  it("throw with winnerSide west: winner is west, loser is east", () => {
    const script = makeScript("throw", "west");
    const { east: loser, west: winner } = getTargetState("finish", 1, "west", script);
    expect(winner.bodyPhase).toBe("gripping");
    expect(loser.bodyPhase).toBe("thrown");
    expect(loser.arcHeight).toBeCloseTo(0.12, 10);
    expect(loser.arcProgress).toBe(1.0);
  });

  it("force_out with winnerSide west: winner is west, loser is east", () => {
    const script = makeScript("force_out", "west");
    const { east: loser, west: winner } = getTargetState("finish", 1, "west", script);
    expect(winner.bodyPhase).toBe("gripping");
    expect(loser.bodyPhase).toBe("falling");
  });
});

// ---------------------------------------------------------------------------
// getTargetState — non-finish phases return valid states without arc fields
// ---------------------------------------------------------------------------

describe("getTargetState — non-finish phases", () => {
  const phases = ["ritual", "tachiai", "clinch", "momentum", "ceremony"] as const;

  for (const phase of phases) {
    it(`${phase}: returns valid states without arc fields for all families`, () => {
      for (const family of ALL_FAMILIES) {
        const script = makeScript(family);
        const { east, west } = getTargetState(phase, 0.5, "east", script);
        expect(east.pos.x).toBeGreaterThanOrEqual(0);
        expect(east.pos.x).toBeLessThanOrEqual(1);
        expect(east.pos.y).toBeGreaterThanOrEqual(0);
        expect(east.pos.y).toBeLessThanOrEqual(1);
        expect(west.pos.x).toBeGreaterThanOrEqual(0);
        expect(west.pos.x).toBeLessThanOrEqual(1);
        expect(west.pos.y).toBeGreaterThanOrEqual(0);
        expect(west.pos.y).toBeLessThanOrEqual(1);
        expect(east.arcHeight).toBeUndefined();
        expect(east.arcProgress).toBeUndefined();
        expect(west.arcHeight).toBeUndefined();
        expect(west.arcProgress).toBeUndefined();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// lerpState — arc field interpolation
// ---------------------------------------------------------------------------

describe("lerpState — arc field interpolation", () => {
  it("both endpoints have arcHeight → lerped value", () => {
    const a = makeState({ arcHeight: 0 });
    const b = makeState({ arcHeight: 0.12 });
    const result = lerpState(a, b, 0.5);
    expect(result.arcHeight).toBeCloseTo(0.06, 10);
  });

  it("both endpoints have arcProgress → lerped value", () => {
    const a = makeState({ arcProgress: 0 });
    const b = makeState({ arcProgress: 1.0 });
    const result = lerpState(a, b, 0.5);
    expect(result.arcProgress).toBeCloseTo(0.5, 10);
  });

  it("a.arcHeight undefined, b.arcHeight defined → result is b.arcHeight", () => {
    const a = makeState();
    const b = makeState({ arcHeight: 0.12 });
    const result = lerpState(a, b, 0.5);
    expect(result.arcHeight).toBe(0.12);
  });

  it("a.arcHeight defined, b.arcHeight undefined → result is undefined", () => {
    const a = makeState({ arcHeight: 0.12 });
    const b = makeState();
    const result = lerpState(a, b, 0.5);
    expect(result.arcHeight).toBeUndefined();
  });

  it("both undefined → result is undefined", () => {
    const a = makeState();
    const b = makeState();
    const result = lerpState(a, b, 0.5);
    expect(result.arcHeight).toBeUndefined();
    expect(result.arcProgress).toBeUndefined();
  });

  it("bodyPhase switches at t > 0.5", () => {
    const a = makeState({ bodyPhase: "falling" });
    const b = makeState({ bodyPhase: "thrown" });
    expect(lerpState(a, b, 0.49).bodyPhase).toBe("falling");
    expect(lerpState(a, b, 0.5).bodyPhase).toBe("falling");
    expect(lerpState(a, b, 0.51).bodyPhase).toBe("thrown");
  });
});

// ---------------------------------------------------------------------------
// computeArcProgress
// ---------------------------------------------------------------------------

describe("computeArcProgress", () => {
  it("throw family: arc progresses 0→1 as finish progresses 0→0.7", () => {
    expect(computeArcProgress(0, "throw")).toBe(0);
    expect(computeArcProgress(0.35, "throw")).toBeCloseTo(0.5, 10);
    expect(computeArcProgress(0.7, "throw")).toBeCloseTo(1.0, 10);
    expect(computeArcProgress(1.0, "throw")).toBe(1.0);
  });

  it("lift family: same curve as throw", () => {
    expect(computeArcProgress(0, "lift")).toBe(0);
    expect(computeArcProgress(0.35, "lift")).toBeCloseTo(0.5, 10);
    expect(computeArcProgress(0.7, "lift")).toBeCloseTo(1.0, 10);
    expect(computeArcProgress(1.0, "lift")).toBe(1.0);
  });

  it("force_out family: always 0", () => {
    expect(computeArcProgress(0, "force_out")).toBe(0);
    expect(computeArcProgress(0.5, "force_out")).toBe(0);
    expect(computeArcProgress(1.0, "force_out")).toBe(0);
  });

  it("pull family: always 0", () => {
    expect(computeArcProgress(0.5, "pull")).toBe(0);
  });

  it("trip family: always 0", () => {
    expect(computeArcProgress(0.5, "trip")).toBe(0);
  });

  it("generic family: always 0", () => {
    expect(computeArcProgress(0.5, "generic")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeArcHeight
// ---------------------------------------------------------------------------

describe("computeArcHeight", () => {
  it("throw family: sin curve peaking at 0.12", () => {
    expect(computeArcHeight(0, "throw")).toBeCloseTo(0, 10);
    expect(computeArcHeight(0.5, "throw")).toBeCloseTo(0.12, 10);
    expect(computeArcHeight(1.0, "throw")).toBeCloseTo(0, 10);
  });

  it("lift family: sin curve peaking at 0.09", () => {
    expect(computeArcHeight(0, "lift")).toBeCloseTo(0, 10);
    expect(computeArcHeight(0.5, "lift")).toBeCloseTo(0.09, 10);
    expect(computeArcHeight(1.0, "lift")).toBeCloseTo(0, 10);
  });

  it("force_out family: always 0", () => {
    expect(computeArcHeight(0.5, "force_out")).toBe(0);
  });

  it("pull family: always 0", () => {
    expect(computeArcHeight(0.5, "pull")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getLoserBodyPhase
// ---------------------------------------------------------------------------

describe("getLoserBodyPhase", () => {
  it("throw → thrown", () => {
    expect(getLoserBodyPhase("throw")).toBe("thrown");
  });

  it("pull → thrown", () => {
    expect(getLoserBodyPhase("pull")).toBe("thrown");
  });

  it("lift → thrown", () => {
    expect(getLoserBodyPhase("lift")).toBe("thrown");
  });

  it("force_out → falling", () => {
    expect(getLoserBodyPhase("force_out")).toBe("falling");
  });

  it("trip → falling", () => {
    expect(getLoserBodyPhase("trip")).toBe("falling");
  });

  it("generic → falling", () => {
    expect(getLoserBodyPhase("generic")).toBe("falling");
  });
});

// ---------------------------------------------------------------------------
// getWinnerBodyPhase
// ---------------------------------------------------------------------------

describe("getWinnerBodyPhase", () => {
  it("force_out → gripping", () => {
    expect(getWinnerBodyPhase("force_out")).toBe("gripping");
  });

  it("throw → gripping", () => {
    expect(getWinnerBodyPhase("throw")).toBe("gripping");
  });

  it("lift → gripping", () => {
    expect(getWinnerBodyPhase("lift")).toBe("gripping");
  });

  it("pull → pushing", () => {
    expect(getWinnerBodyPhase("pull")).toBe("pushing");
  });

  it("trip → throwing", () => {
    expect(getWinnerBodyPhase("trip")).toBe("throwing");
  });

  it("generic → throwing", () => {
    expect(getWinnerBodyPhase("generic")).toBe("throwing");
  });
});
