import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import { OpponentScoutingTab } from "@/components/scouting/OpponentScoutingTab";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

vi.mock("@/presenters/uiDigest", () => ({
  projectOpponentScoutingUIDigest: () => ({ opponents: mockOpponents }),
  setScoutingInvestment: vi.fn(),
  RANK_NAMES: {
    yokozuna: { ja: "横綱", en: "Yokozuna" },
    ozeki: { ja: "大関", en: "Ozeki" },
    maegashira: { ja: "前頭", en: "Maegashira" },
  },
  RANK_HIERARCHY: {
    yokozuna: { tier: 0 },
    ozeki: { tier: 1 },
    sekiwake: { tier: 2 },
    komusubi: { tier: 3 },
    maegashira: { tier: 4 },
    juryo: { tier: 5 },
    makushita: { tier: 6 },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/scouting/AttrChip", () => ({
  AttrChip: () => React.createElement("div", { "data-testid": "attr-chip" }),
}));

const STORAGE_KEY = "basho_sort_opponent_scouting";

let mockOpponents: any[] = [];

function makeOpponent(id: string, overrides: any = {}): any {
  return {
    id,
    shikona: `Opponent-${id}`,
    rank: "maegashira",
    rankNumber: 1,
    division: "makuuchi",
    heyaName: "TestHeya",
    height: 180,
    heightDescriptor: "Tall",
    weight: 150,
    weightDescriptor: "Heavy",
    scoutLevel: 50,
    scoutInfo: { label: "Fair", color: "text-muted-foreground", narrative: "" },
    scoutedProgress: 50,
    scoutingInvestment: "none",
    scoutedAttrs: {},
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
    updateWorld: vi.fn(),
  } as any);
}

function getCardOrder(): string[] {
  const cards = document.querySelectorAll(".paper.cursor-pointer");
  return Array.from(cards).map(
    (el) => el.querySelector(".font-display")?.textContent ?? ""
  );
}

describe("OpponentScoutingTab sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpponents = [
      makeOpponent("r1", {
        shikona: "Alpha",
        rank: "maegashira",
        rankNumber: 5,
        division: "makuuchi",
        scoutLevel: 30,
      }),
      makeOpponent("r2", {
        shikona: "Bravo",
        rank: "yokozuna",
        rankNumber: 0,
        division: "makuuchi",
        scoutLevel: 80,
      }),
      makeOpponent("r3", {
        shikona: "Charlie",
        rank: "ozeki",
        rankNumber: 0,
        division: "makuuchi",
        scoutLevel: 50,
      }),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("defaults to rank order (yokozuna, ozeki, maegashira)", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OpponentScoutingTab playerHeyaId="h1" />);
    const order = getCardOrder();
    expect(order).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OpponentScoutingTab playerHeyaId="h1" />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by shikona ascending reorders alphabetically", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OpponentScoutingTab playerHeyaId="h1" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Shikona"));
    const order = getCardOrder();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by scout level ascending", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OpponentScoutingTab playerHeyaId="h1" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Scout Level"));
    const order = getCardOrder();
    // asc: 30, 50, 80 → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OpponentScoutingTab playerHeyaId="h1" />);
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
    render(<OpponentScoutingTab playerHeyaId="h1" />);
    const order = getCardOrder();
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});
