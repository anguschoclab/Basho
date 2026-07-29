import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RosterWidget } from "@/components/dashboard/RosterWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/contexts/GameContext";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/GameContext");

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Wrestler-${id}`,
    heyaId: "h1",
    rank: "maegashira",
    rankNumber: 1,
    division: "makuuchi",
    side: "east",
    style: "oshi",
    stats: {
      power: 50,
      speed: 50,
      technique: 50,
      balance: 50,
      weight: 140,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      experience: 50,
      aggression: 50,
    },
    fatigue: 30,
    injured: false,
    isRetired: false,
    isKyujo: false,
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    ...overrides,
  } as Rikishi;
}

function makeWorld(rikishiList: Rikishi[]): WorldState {
  const rikishi = new Map<string, Rikishi>();
  for (const r of rikishiList) rikishi.set(r.id, r);
  return {
    rikishi,
    activeRikishiIds: new Set(rikishiList.map((r) => r.id)),
    heyas: new Map([
      ["h1", { id: "h1", name: "TestHeya", rikishiIds: rikishiList.map((r) => r.id) } as any],
    ]),
    playerHeyaId: "h1",
  } as unknown as WorldState;
}

function mockUseGame(world: WorldState | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
    updateWorld: vi.fn(),
  } as any);
}

describe("RosterWidget selection", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("highlights selected rikishi", () => {
    const rikishiList = Array.from({ length: 5 }, (_, i) => makeRikishi(`r${i + 1}`));
    mockUseGame(makeWorld(rikishiList));

    render(
      <TooltipProvider>
        <RosterWidget />
      </TooltipProvider>
    );

    const row1 = screen.getByText("Wrestler-r1").closest("div");
    fireEvent.click(row1!);

    const row2 = screen.getByText("Wrestler-r2").closest("div");
    fireEvent.click(row2!);

    expect(row1!.className).toContain("bg-primary/10");
    expect(row2!.className).toContain("bg-primary/10");
  });

  it("toggles selection on click (deselects on second click)", () => {
    const rikishiList = Array.from({ length: 3 }, (_, i) => makeRikishi(`r${i + 1}`));
    mockUseGame(makeWorld(rikishiList));

    render(
      <TooltipProvider>
        <RosterWidget />
      </TooltipProvider>
    );

    const row1 = screen.getByText("Wrestler-r1").closest("div");
    fireEvent.click(row1!);
    expect(row1!.className).toContain("bg-primary/10");

    fireEvent.click(row1!);
    expect(row1!.className).not.toContain("bg-primary/10");
  });

  it("limits selection to 2 rikishi (drops oldest)", () => {
    const rikishiList = Array.from({ length: 5 }, (_, i) => makeRikishi(`r${i + 1}`));
    mockUseGame(makeWorld(rikishiList));

    render(
      <TooltipProvider>
        <RosterWidget />
      </TooltipProvider>
    );

    const row1 = screen.getByText("Wrestler-r1").closest("div");
    fireEvent.click(row1!);

    const row2 = screen.getByText("Wrestler-r2").closest("div");
    fireEvent.click(row2!);

    const row3 = screen.getByText("Wrestler-r3").closest("div");
    fireEvent.click(row3!);

    expect(row1!.className).not.toContain("bg-primary/10");
    expect(row2!.className).toContain("bg-primary/10");
    expect(row3!.className).toContain("bg-primary/10");
  });
});
