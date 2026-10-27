import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { TrainingWidget } from "@/components/dashboard/TrainingWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/state/game/useGame";
import type { WorldState } from "@/engine/types/world";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/state/game/useGame");

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
          name: "TestHeya",
          trainingState: {
            activeProfile: {
              intensity: "balanced",
              focus: "neutral",
              recovery: "normal",
            },
          },
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

describe("TrainingWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderWidget() {
    return render(
      <TooltipProvider>
        <TrainingWidget />
      </TooltipProvider>
    );
  }

  it("renders null when no world", () => {
    mockUseGame(null);
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });

  it("renders profile badges when world exists", () => {
    mockUseGame(makeWorld());
    renderWidget();
    expect(screen.getByText(/balanced/i)).toBeTruthy();
    expect(screen.getByText(/Neutral/i)).toBeTruthy();
  });

  it("shows quick-change toggle button", () => {
    mockUseGame(makeWorld());
    renderWidget();
    expect(screen.getByText(/Quick-change/)).toBeTruthy();
  });
});

describe("TrainingWidget a11y", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("exposes multiplier bars as progressbars with bounded values", () => {
    mockUseGame(makeWorld());
    render(
      <TooltipProvider>
        <TrainingWidget />
      </TooltipProvider>
    );

    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(bar.getAttribute("aria-valuemin")).toBe("0");
      expect(bar.getAttribute("aria-valuemax")).toBe("100");
      const now = Number(bar.getAttribute("aria-valuenow"));
      expect(now).toBeGreaterThanOrEqual(0);
      expect(now).toBeLessThanOrEqual(100);
    }
  });
});
