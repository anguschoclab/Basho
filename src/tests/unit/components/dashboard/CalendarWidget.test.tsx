import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    year: 2026,
    week: 5,
    cyclePhase: "interim",
    currentBashoName: "hatsu",
    calendar: { currentWeek: 5 },
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    heyas: new Map(),
    ...overrides,
  } as unknown as WorldState;
}

function mockUseGame(world: WorldState | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
    advanceInterim: vi.fn(),
    advanceOneDay: vi.fn(),
    simulateAllBouts: vi.fn(),
    endDay: vi.fn(),
    advanceDay: vi.fn(),
    simFullBasho: vi.fn(),
  } as any);
}

describe("CalendarWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderWidget() {
    return render(
      <TooltipProvider>
        <CalendarWidget />
      </TooltipProvider>
    );
  }

  it("renders date and week", () => {
    mockUseGame(makeWorld());
    renderWidget();
    expect(screen.getByText(/Hatsu 2026/)).toBeTruthy();
    expect(screen.getByText(/Week 5/)).toBeTruthy();
  });

  it("renders phase label for interim", () => {
    mockUseGame(makeWorld({ cyclePhase: "interim" }));
    renderWidget();
    expect(screen.getByText("Off-Season")).toBeTruthy();
  });

  it("renders phase label for active_basho", () => {
    mockUseGame(
      makeWorld({
        cyclePhase: "active_basho",
        currentBasho: { day: 3 } as any,
      })
    );
    renderWidget();
    expect(screen.getByText("Tournament")).toBeTruthy();
  });

  it("renders null when no world", () => {
    mockUseGame(null);
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });

  it("shows Day and Week buttons in interim", () => {
    mockUseGame(makeWorld({ cyclePhase: "interim" }));
    renderWidget();
    expect(screen.getByText("Day")).toBeTruthy();
    expect(screen.getByText("Week")).toBeTruthy();
  });

  it("shows Sim Day and Sim All buttons in active_basho", () => {
    mockUseGame(
      makeWorld({
        cyclePhase: "active_basho",
        currentBasho: { day: 3 } as any,
      })
    );
    renderWidget();
    expect(screen.getByText("Sim Day")).toBeTruthy();
    expect(screen.getByText("Sim All")).toBeTruthy();
  });
});
