import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mockUseGame = vi.fn();
vi.mock("@/contexts/useGame", () => ({
  useGame: () => mockUseGame(),
}));

import { YushoRaceWidget } from "@/components/dashboard/YushoRaceWidget";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function makeWorldWithBasho(rikishi: Rikishi[], wins: number[]): WorldState {
  const world = MockFactory.createWorld();
  world.currentBasho = MockFactory.createBasho({
    standings: new Map(rikishi.map((r, i) => [r.id, { wins: wins[i], losses: 0 }])),
  });
  for (const r of rikishi) {
    world.rikishi.set(r.id, r);
    world.activeRikishiIds.add(r.id);
  }
  return world;
}

describe("YushoRaceWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders EmptyState when no active basho", () => {
    const world = MockFactory.createWorld();
    delete (world as any).currentBasho;
    mockUseGame.mockReturnValue({ state: { world } });

    render(
      <TooltipProvider>
        <YushoRaceWidget />
      </TooltipProvider>
    );

    expect(screen.getByText("No active Yūshō race")).not.toBeNull();
  });

  it("renders EmptyState when no contenders", () => {
    const world = MockFactory.createWorld();
    world.currentBasho = MockFactory.createBasho({ standings: new Map() });
    mockUseGame.mockReturnValue({ state: { world } });

    render(
      <TooltipProvider>
        <YushoRaceWidget />
      </TooltipProvider>
    );

    expect(screen.getByText("No active Yūshō race")).not.toBeNull();
  });

  it("renders top contenders with avatars and badges", () => {
    const r1 = MockFactory.createRikishi("r1", {
      division: "makuuchi",
      shikona: "Alpha",
      currentBashoWins: 10,
    });
    const r2 = MockFactory.createRikishi("r2", {
      division: "makuuchi",
      shikona: "Beta",
      currentBashoWins: 8,
    });
    const world = makeWorldWithBasho([r1, r2], [10, 8]);
    mockUseGame.mockReturnValue({ state: { world } });

    render(
      <TooltipProvider>
        <YushoRaceWidget />
      </TooltipProvider>
    );

    expect(screen.getByText("Alpha")).not.toBeNull();
    expect(screen.getByText("Beta")).not.toBeNull();
    expect(screen.getByText("Yūshō Race")).not.toBeNull();
  });

  it("navigates to banzuke on header action click", () => {
    const r1 = MockFactory.createRikishi("r1", {
      division: "makuuchi",
      shikona: "Alpha",
      currentBashoWins: 10,
    });
    const world = makeWorldWithBasho([r1], [10]);
    mockUseGame.mockReturnValue({ state: { world } });

    render(
      <TooltipProvider>
        <YushoRaceWidget />
      </TooltipProvider>
    );

    const btn = screen.getByRole("button", { name: "View Full Banzuke" });
    btn.click();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/basho/banzuke" });
  });
});
