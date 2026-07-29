// @vitest-environment node
/**
 * Tests for boutCanvas/draw.ts — drawRikishi behavior with new BodyPhase
 * values, arc y-offset, and family/isLoser params.
 */
import { describe, it, expect, vi } from "vitest";
import { drawRikishi } from "@/components/game/boutReplay/boutCanvas/draw";
import type { RikishiState, BodyPhase } from "@/components/game/boutReplay/boutCanvas/types";
import type { UIRikishi } from "@/presenters/uiModels";

// ---------------------------------------------------------------------------
// Mock canvas context
// ---------------------------------------------------------------------------

function makeMockCtx() {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    set fillStyle(_v: string) {},
    get fillStyle() {
      return "";
    },
    set strokeStyle(_v: string) {},
    get strokeStyle() {
      return "";
    },
    set lineWidth(_v: number) {},
    get lineWidth() {
      return 0;
    },
    set lineCap(_v: CanvasLineCap) {},
    get lineCap() {
      return "butt" as CanvasLineCap;
    },
    set font(_v: string) {},
    get font() {
      return "";
    },
    set textAlign(_v: CanvasTextAlign) {},
    get textAlign() {
      return "start" as CanvasTextAlign;
    },
    set textBaseline(_v: CanvasTextBaseline) {},
    get textBaseline() {
      return "alphabetic" as CanvasTextBaseline;
    },
    set globalAlpha(_v: number) {},
    get globalAlpha() {
      return 1;
    },
    roundRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

function makeUIRikishi(): UIRikishi {
  return {
    id: "r1",
    shikona: "TestRikishi",
  } as unknown as UIRikishi;
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

const ALL_BODY_PHASES: BodyPhase[] = [
  "standing",
  "bowing",
  "charging",
  "grappling",
  "pushing",
  "throwing",
  "thrown",
  "gripping",
  "falling",
  "victory",
];

const W = 800;
const H = 500;

// ---------------------------------------------------------------------------
// drawRikishi — non-crash for all BodyPhase values
// ---------------------------------------------------------------------------

describe("drawRikishi — non-crash for all BodyPhase values", () => {
  it.each(ALL_BODY_PHASES)(`does not crash for bodyPhase "%s"`, (phase) => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: phase });
    expect(() =>
      drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 })
    ).not.toThrow();
  });

  it.each(ALL_BODY_PHASES)(`calls save() and restore() for bodyPhase "%s"`, (phase) => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: phase });
    drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 });
    expect((ctx as unknown as { save: ReturnType<typeof vi.fn> }).save).toHaveBeenCalled();
    expect((ctx as unknown as { restore: ReturnType<typeof vi.fn> }).restore).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// drawRikishi — arc y-offset
// ---------------------------------------------------------------------------

describe("drawRikishi — arc y-offset", () => {
  it("applies y-offset when arcProgress and arcHeight are set", () => {
    const ctx = makeMockCtx();
    const state = makeState({
      bodyPhase: "thrown",
      arcProgress: 0.5,
      arcHeight: 0.12,
      pos: { x: 0.5, y: 0.5 },
    });
    drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 });

    const translateCalls = (ctx as unknown as { translate: ReturnType<typeof vi.fn> }).translate
      .mock.calls;
    expect(translateCalls.length).toBeGreaterThan(0);
    const [tx, ty] = translateCalls[0];
    // Expected y = 0.5 * 500 - sin(0.5 * PI) * 0.12 * 500 = 250 - 60 = 190
    const expectedY = 0.5 * H - Math.sin(0.5 * Math.PI) * 0.12 * H;
    expect(ty).toBeCloseTo(expectedY, 1);
    expect(tx).toBeCloseTo(0.5 * W, 1);
  });

  it("applies no y-offset when arcProgress is 0", () => {
    const ctx = makeMockCtx();
    const state = makeState({
      bodyPhase: "thrown",
      arcProgress: 0,
      arcHeight: 0.12,
      pos: { x: 0.5, y: 0.5 },
    });
    drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 });

    const translateCalls = (ctx as unknown as { translate: ReturnType<typeof vi.fn> }).translate
      .mock.calls;
    const [, ty] = translateCalls[0];
    // sin(0) = 0, so no offset
    expect(ty).toBeCloseTo(0.5 * H, 1);
  });

  it("applies no y-offset when arcProgress is undefined", () => {
    const ctx = makeMockCtx();
    const state = makeState({
      bodyPhase: "standing",
      pos: { x: 0.5, y: 0.5 },
    });
    drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 });

    const translateCalls = (ctx as unknown as { translate: ReturnType<typeof vi.fn> }).translate
      .mock.calls;
    const [, ty] = translateCalls[0];
    expect(ty).toBeCloseTo(0.5 * H, 1);
  });
});

// ---------------------------------------------------------------------------
// drawRikishi — family/isLoser params
// ---------------------------------------------------------------------------

describe("drawRikishi — family/isLoser params", () => {
  it("does not crash with family throw, isLoser true, bodyPhase thrown", () => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: "thrown" });
    expect(() =>
      drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 }, "throw", true)
    ).not.toThrow();
  });

  it("does not crash with family force_out, isLoser false, bodyPhase gripping", () => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: "gripping" });
    expect(() =>
      drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 }, "force_out", false)
    ).not.toThrow();
  });

  it("does not crash without family/isLoser (undefined)", () => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: "standing" });
    expect(() =>
      drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 })
    ).not.toThrow();
  });

  it("does not crash with family lift, isLoser true, bodyPhase thrown", () => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: "thrown" });
    expect(() =>
      drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 }, "lift", true)
    ).not.toThrow();
  });

  it("does not crash with family pull, isLoser true, bodyPhase thrown", () => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: "thrown" });
    expect(() =>
      drawRikishi(ctx, state, W, H, "west", makeUIRikishi(), { x: 0, y: 0 }, "pull", true)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// drawRikishi — grimace for "thrown"
// ---------------------------------------------------------------------------

describe("drawRikishi — grimace for thrown bodyPhase", () => {
  it("draws grimace arc stroke for bodyPhase thrown", () => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: "thrown" });
    drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 });

    // The grimace draws an arc with Math.PI as the end angle, then strokes.
    // Check that arc was called with Math.PI at some point, and stroke was called.
    const arcCalls = (ctx as unknown as { arc: ReturnType<typeof vi.fn> }).arc.mock.calls;
    const hasGrimaceArc = arcCalls.some((call) => call[3] === 0 && call[4] === Math.PI);
    expect(hasGrimaceArc).toBe(true);
  });

  it("draws grimace arc stroke for bodyPhase falling", () => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: "falling" });
    drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 });

    const arcCalls = (ctx as unknown as { arc: ReturnType<typeof vi.fn> }).arc.mock.calls;
    const hasGrimaceArc = arcCalls.some((call) => call[3] === 0 && call[4] === Math.PI);
    expect(hasGrimaceArc).toBe(true);
  });

  it("does not draw grimace for bodyPhase standing", () => {
    const ctx = makeMockCtx();
    const state = makeState({ bodyPhase: "standing" });
    drawRikishi(ctx, state, W, H, "east", makeUIRikishi(), { x: 0, y: 0 });

    const arcCalls = (ctx as unknown as { arc: ReturnType<typeof vi.fn> }).arc.mock.calls;
    const hasGrimaceArc = arcCalls.some((call) => call[3] === 0 && call[4] === Math.PI);
    expect(hasGrimaceArc).toBe(false);
  });
});
