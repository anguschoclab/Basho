import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import { StableIntelTab } from "@/components/scouting/StableIntelTab";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

vi.mock("@/engine/core/EntityCollection", () => ({
  EntityCollection: {
    getHeyaRoster: (_world: any, heyaId: string) => {
      return mockRoster.filter((r) => r.heyaId === heyaId);
    },
  },
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectRikishi: (r: any) => r,
  RANK_HIERARCHY: {
    yokozuna: { tier: 0 },
    ozeki: { tier: 1 },
    sekiwake: { tier: 2 },
    komusubi: { tier: 3 },
    maegashira: { tier: 4 },
    juryo: { tier: 5 },
    makushita: { tier: 6 },
  },
  RANK_NAMES: {
    yokozuna: { ja: "横綱", en: "Yokozuna" },
    ozeki: { ja: "大関", en: "Ozeki" },
    maegashira: { ja: "前頭", en: "Maegashira" },
  },
}));

const STORAGE_KEY = "basho_sort_stable_intel";

let mockRoster: any[] = [];

function makeRikishi(id: string, overrides: any = {}): any {
  return {
    id,
    shikona: `Rikishi-${id}`,
    heyaId: "h1",
    rank: "maegashira",
    rankNumber: 1,
    side: "east",
    powerBand: "Strong",
    techniqueBand: "Great",
    currentBashoWins: 8,
    currentBashoLosses: 7,
    isInjured: false,
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

function getRowOrder(): string[] {
  const rows = document.querySelectorAll(".flex.items-center.gap-4.p-3");
  return Array.from(rows).map((el) => el.querySelector(".font-display")?.textContent ?? "");
}

describe("StableIntelTab sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRoster = [
      makeRikishi("r1", {
        shikona: "Alpha",
        rank: "maegashira",
        rankNumber: 5,
        powerBand: "Strong",
        techniqueBand: "Good",
      }),
      makeRikishi("r2", {
        shikona: "Bravo",
        rank: "yokozuna",
        rankNumber: 0,
        powerBand: "Monstrous",
        techniqueBand: "Great",
      }),
      makeRikishi("r3", {
        shikona: "Charlie",
        rank: "ozeki",
        rankNumber: 0,
        powerBand: "Dominant",
        techniqueBand: "Feeble",
      }),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("defaults to rank order (yokozuna, ozeki, maegashira)", () => {
    const world = { playerHeyaId: "h1" };
    mockUseGame(world);
    render(<StableIntelTab playerHeyaId="h1" />);
    const order = getRowOrder();
    expect(order).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StableIntelTab playerHeyaId="h1" />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by shikona ascending reorders alphabetically", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StableIntelTab playerHeyaId="h1" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Shikona"));
    const order = getRowOrder();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by power ascending", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StableIntelTab playerHeyaId="h1" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Power"));
    const order = getRowOrder();
    // asc: Dominant, Monstrous, Strong → Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("sorting by technique ascending", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StableIntelTab playerHeyaId="h1" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Technique"));
    const order = getRowOrder();
    // asc: Feeble, Good, Great → Charlie, Alpha, Bravo
    expect(order).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StableIntelTab playerHeyaId="h1" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Shikona"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("shikona");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "shikona", order: "desc" }));
    mockUseGame({ playerHeyaId: "h1" });
    render(<StableIntelTab playerHeyaId="h1" />);
    const order = getRowOrder();
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});
