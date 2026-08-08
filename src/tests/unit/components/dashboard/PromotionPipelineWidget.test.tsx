import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { PromotionPipelineWidget } from "@/components/dashboard/PromotionPipelineWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    year: 2026,
    week: 5,
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    heyas: new Map(),
    ...overrides,
  } as unknown as WorldState;
}

function mockUseGame(world: WorldState | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

describe("PromotionPipelineWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderWidget() {
    return render(
      <TooltipProvider>
        <PromotionPipelineWidget />
      </TooltipProvider>
    );
  }

  it("renders null when no world", () => {
    mockUseGame(null);
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });

  it("renders empty state when no promotion activity", () => {
    mockUseGame(makeWorld());
    renderWidget();
    expect(screen.getByText(/No promotion activity/)).toBeTruthy();
  });

  it("renders Full Banzuke button", () => {
    mockUseGame(makeWorld());
    renderWidget();
    expect(screen.getByText(/Full Banzuke/)).toBeTruthy();
  });
});
