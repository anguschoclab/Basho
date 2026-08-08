import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { KenshoManagementWidget } from "@/components/dashboard/KenshoManagementWidget";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

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
    economics: { careerKenshoWon: 2 } as any,
    ...overrides,
  } as Rikishi;
}

function makeWorld(rikishiList: Rikishi[] = []): WorldState {
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
  } as any);
}

describe("KenshoManagementWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders null when no heyaId", () => {
    mockUseGame({} as WorldState);
    const { container } = render(<KenshoManagementWidget />);
    expect(container.firstChild).toBeNull();
  });

  it("renders summary stats with rikishi", () => {
    const r = makeRikishi("r1", { economics: { careerKenshoWon: 3 } as any });
    mockUseGame(makeWorld([r]));
    render(<KenshoManagementWidget />);
    expect(screen.getByText("Total Earnings")).toBeTruthy();
    expect(screen.getByText("Projected (Basho)")).toBeTruthy();
  });

  it("shows no kensho awards in empty state", () => {
    const r = makeRikishi("r1", { economics: { careerKenshoWon: 0 } as any });
    mockUseGame(makeWorld([r]));
    render(<KenshoManagementWidget />);
    expect(screen.getByText(/No kensho awards/)).toBeTruthy();
  });

  it("renders rikishi breakdown", () => {
    const r = makeRikishi("r1", { economics: { careerKenshoWon: 1 } as any });
    mockUseGame(makeWorld([r]));
    render(<KenshoManagementWidget />);
    expect(screen.getByText("Rikishi Breakdown")).toBeTruthy();
    expect(screen.getByText("Wrestler-r1")).toBeTruthy();
  });
});
