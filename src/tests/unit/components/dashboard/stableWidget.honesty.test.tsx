/**
 * stableWidget.honesty.test.tsx
 *
 * Regression test for fabricated dashboard metrics (audit WS4-01).
 *
 * StableWidget unconditionally renders "Staff Development — Level 3 / 5"
 * (Progress 60) and "Naturalization — Years: 4 / 10" (Progress 40). Neither
 * maps to any engine state — staff have no development level, and
 * naturalization is a 5-year tenure rule, not a 10-year progress bar.
 * Every on-screen number must derive from real state; these rows must be
 * removed or bound to real fields.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { StableWidget } from "@/components/dashboard/StableWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

vi.mock("@/presenters/uiDigest", () => ({
  getCachedPerception: vi.fn(() => ({
    statureBand: "strong",
    moraleBand: "content",
    welfareBand: "safe",
    welfareRiskBand: "safe",
    depthBand: "competitive",
    rosterStrengthBand: "competitive",
    financeBand: "comfortable",
    koenkaiBand: "moderate",
    trainingBand: "balanced",
    recruitingBand: "neutral",
    rivalryBand: "neutral",
    mediaBand: "neutral",
  })),
}));

describe("StableWidget — honesty", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("does not render fabricated Staff Development / Naturalization rows", () => {
    vi.mocked(GameContext.useGame).mockReturnValue({
      state: {
        world: {
          year: 2026,
          week: 5,
          playerHeyaId: "h1",
          heyas: new Map(),
          rikishi: new Map(),
          activeRikishiIds: new Set(),
        } as unknown as WorldState,
      },
      updateWorld: vi.fn(),
    } as any);

    const { queryByText } = render(
      <TooltipProvider>
        <StableWidget />
      </TooltipProvider>
    );

    expect(queryByText(/Staff Development/i)).toBeNull();
    expect(queryByText(/Naturalization/i)).toBeNull();
    expect(queryByText(/Level \d+ \/ 5/)).toBeNull();
    expect(queryByText(/Years: \d+ \/ 10/)).toBeNull();
  });
});
