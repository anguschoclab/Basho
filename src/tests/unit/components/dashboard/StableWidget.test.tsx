import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
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

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    year: 2026,
    week: 5,
    playerHeyaId: "h1",
    heyas: new Map([
      [
        "h1",
        {
          id: "h1",
          name: "Test Heya",
          reputation: 60,
          governanceStatus: "good_standing",
          scandalScore: 0,
          facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 },
        },
      ],
    ]),
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    ...overrides,
  } as unknown as WorldState;
}

function mockUseGame(world: WorldState | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
    updateWorld: vi.fn(),
  } as any);
}

describe("StableWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders without crashing when world is available", () => {
    const world = makeWorld();
    mockUseGame(world);
    const { container, getByText } = render(
      <TooltipProvider>
        <StableWidget />
      </TooltipProvider>
    );
    expect(container.childNodes.length).toBeGreaterThan(0);
    expect(getByText(/Morale/i)).toBeDefined();
  });

  it("renders without crashing when world is null", () => {
    mockUseGame(null);
    const { container } = render(
      <TooltipProvider>
        <StableWidget />
      </TooltipProvider>
    );
    expect(container.childNodes.length).toBeGreaterThan(0);
  });
});
