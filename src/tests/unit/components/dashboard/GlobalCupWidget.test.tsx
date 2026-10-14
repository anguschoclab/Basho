import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GlobalCupWidget } from "@/components/dashboard/GlobalCupWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/contexts/useGame";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/contexts/useGame");

function renderWidget() {
  return render(
    <TooltipProvider>
      <GlobalCupWidget />
    </TooltipProvider>
  );
}

function mockUseGame(world: unknown) {
  vi.mocked(GameContext.useGame).mockReturnValue({ state: { world } } as never);
}

function buildWorldStub(globalCup: unknown) {
  return {
    globalCup,
    rikishi: new Map([["r1", { id: "r1", shikona: "Terunofuji" }]]),
  };
}

describe("GlobalCupWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders empty state when no cup exists", () => {
    mockUseGame(buildWorldStub(undefined));
    renderWidget();
    expect(screen.getByText(/Global Cup will begin during interim weeks 10-11/)).toBeTruthy();
  });

  it("renders empty state when cup is inactive", () => {
    mockUseGame(buildWorldStub({ isActive: false }));
    renderWidget();
    expect(screen.getByText(/Global Cup will begin during interim weeks 10-11/)).toBeTruthy();
  });

  it("renders active cup with phase, participants, and match progress", () => {
    mockUseGame(
      buildWorldStub({
        isActive: true,
        phase: "semifinals",
        participants: ["r1", "r2", "r3", "r4"],
        bracket: [{ winnerRikishiId: "r1" }, { winnerRikishiId: "r2" }, {}, {}],
      })
    );
    renderWidget();
    expect(screen.getByText("Worlds Exhibition")).toBeTruthy();
    expect(screen.getByText("Semifinals")).toBeTruthy();
    expect(screen.getByText("4 Participants")).toBeTruthy();
    expect(screen.getByText("2/4 Matches")).toBeTruthy();
  });

  it("renders champion banner when a champion is crowned", () => {
    mockUseGame(
      buildWorldStub({
        isActive: true,
        phase: "complete",
        participants: ["r1", "r2"],
        bracket: [{ winnerRikishiId: "r1" }],
        championId: "r1",
      })
    );
    renderWidget();
    expect(screen.getByText("Champion")).toBeTruthy();
    expect(screen.getByText("Terunofuji")).toBeTruthy();
  });

  it("falls back to Unknown for an unresolvable champion", () => {
    mockUseGame(
      buildWorldStub({
        isActive: true,
        phase: "complete",
        participants: [],
        bracket: [],
        championId: "ghost",
      })
    );
    renderWidget();
    expect(screen.getByText("Unknown")).toBeTruthy();
  });
});
