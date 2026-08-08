import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { FinancesWidget } from "@/components/dashboard/FinancesWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

vi.mock("@/hooks/usePlayerHeya", () => ({
  usePlayerHeya: vi.fn(),
}));

import { usePlayerHeya } from "@/hooks/usePlayerHeya";

function makeWorld(): WorldState {
  return {
    year: 2026,
    week: 5,
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    heyas: new Map(),
  } as unknown as WorldState;
}

function mockUseGame(world: WorldState | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

function mockPlayerHeya(heya: Heya | null) {
  vi.mocked(usePlayerHeya).mockReturnValue({ heya } as any);
}

describe("FinancesWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderWidget() {
    return render(
      <TooltipProvider>
        <FinancesWidget />
      </TooltipProvider>
    );
  }

  it("renders null when no heya", () => {
    mockUseGame(makeWorld());
    mockPlayerHeya(null);
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });

  it("renders status and balance when heya exists", () => {
    mockUseGame(makeWorld());
    mockPlayerHeya({
      id: "h1",
      name: "TestHeya",
      funds: 500000,
      runwayBand: "comfortable",
    } as any);

    renderWidget();
    expect(screen.getByText("Comfortable")).toBeTruthy();
    expect(screen.getByText("¥500,000")).toBeTruthy();
  });

  it("shows risk indicator when financial risk present", () => {
    mockUseGame(makeWorld());
    mockPlayerHeya({
      id: "h1",
      name: "TestHeya",
      funds: 1000,
      runwayBand: "desperate",
      riskIndicators: { financial: true },
    } as any);

    renderWidget();
    expect(screen.getByText(/INSOLVENCY RISK/)).toBeTruthy();
  });
});
