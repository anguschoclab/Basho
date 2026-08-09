import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { ScoutingWidget } from "@/components/dashboard/ScoutingWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

vi.mock("@/engine/systems/generation/TalentPoolService", () => ({
  listVisibleCandidates: vi.fn(() => []),
  getCandidateScoutingLevel: vi.fn(() => 0),
  getTalentPool: vi.fn(() => ({ candidates: [], lastRefreshWeek: 0 })),
}));

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    year: 2026,
    week: 5,
    playerHeyaId: "h1",
    heyas: new Map([
      ["h1", { id: "h1", name: "Test Heya" }],
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

describe("ScoutingWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders without crashing when world is available", () => {
    const world = makeWorld();
    mockUseGame(world);
    const { container, getByText } = render(
      <TooltipProvider>
        <ScoutingWidget />
      </TooltipProvider>
    );
    expect(container.childNodes.length).toBeGreaterThan(0);
    expect(getByText(/Scouting/i)).toBeDefined();
  });

  it("renders without crashing when world is null", () => {
    mockUseGame(null);
    const { container } = render(
      <TooltipProvider>
        <ScoutingWidget />
      </TooltipProvider>
    );
    expect(container.childNodes.length).toBeGreaterThan(0);
  });
});
