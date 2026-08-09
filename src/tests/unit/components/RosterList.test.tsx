import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RosterList } from "@/components/rikishi/RosterList";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UIRikishi } from "@/presenters/uiModels";

const STORAGE_KEY = "basho_sort_roster";

function makeRikishi(overrides: Partial<UIRikishi> = {}): UIRikishi {
  return {
    id: "r1",
    shikona: "TestRikishi",
    rank: "maegashira",
    rankNumber: 1,
    division: "makuuchi",
    side: "east",
    age: 25,
    careerWins: 10,
    careerLosses: 5,
    winPercentage: 0.667,
    streak: 3,
    streakLabel: "W3",
    motivation: 60,
    condition: 70,
    currentBashoWins: 8,
    currentBashoLosses: 7,
    perceivedStats: {
      power: "B+",
      speed: "B",
      technique: "A-",
      stamina: "C",
      mental: "B",
      adaptability: "C+",
      balance: "B",
    } as any,
    ...overrides,
  } as unknown as UIRikishi;
}

function makeRoster(): UIRikishi[] {
  return [
    makeRikishi({
      id: "r1",
      shikona: "Alpha",
      rank: "maegashira",
      rankNumber: 5,
      winPercentage: 0.667,
      streak: 3,
      motivation: 60,
      condition: 70,
    }),
    makeRikishi({
      id: "r2",
      shikona: "Bravo",
      rank: "yokozuna",
      rankNumber: 0,
      winPercentage: 0.8,
      streak: -2,
      motivation: 80,
      condition: 90,
    }),
    makeRikishi({
      id: "r3",
      shikona: "Charlie",
      rank: "ozeki",
      rankNumber: 0,
      winPercentage: 0.72,
      streak: 5,
      motivation: 70,
      condition: 75,
    }),
  ];
}

function getCardOrder(): string[] {
  const cards = document.querySelectorAll("[role='button']");
  return Array.from(cards)
    .map((el) => {
      const displays = el.querySelectorAll(".font-display");
      // The shikona is the second .font-display element (first is the watermark letter)
      return displays[1]?.textContent ?? "";
    })
    .filter((t) => t.length > 0);
}

describe("RosterList sorting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("defaults to rank order (yokozuna, ozeki, maegashira)", () => {
    render(
      <TooltipProvider>
        <RosterList rikishiList={makeRoster()} onRikishiClick={vi.fn()} />
      </TooltipProvider>
    );
    const order = getCardOrder();
    expect(order).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("renders a SortMenu control", () => {
    render(
      <TooltipProvider>
        <RosterList rikishiList={makeRoster()} onRikishiClick={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by shikona ascending reorders alphabetically", () => {
    render(
      <TooltipProvider>
        <RosterList rikishiList={makeRoster()} onRikishiClick={vi.fn()} />
      </TooltipProvider>
    );
    // Open select and choose Shikona
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const shikonaOption = screen.getByText("Shikona");
    fireEvent.click(shikonaOption);
    const order = getCardOrder();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("toggling order after shikona sort reverses to descending", () => {
    render(
      <TooltipProvider>
        <RosterList rikishiList={makeRoster()} onRikishiClick={vi.fn()} />
      </TooltipProvider>
    );
    // Sort by shikona (default asc)
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Shikona"));
    // Toggle to desc
    const toggle = screen.getByRole("button", { name: /toggle sort order/i });
    fireEvent.click(toggle);
    const order = getCardOrder();
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("sorting by win percentage ascending", () => {
    render(
      <TooltipProvider>
        <RosterList rikishiList={makeRoster()} onRikishiClick={vi.fn()} />
      </TooltipProvider>
    );
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Win %"));
    const order = getCardOrder();
    // asc: 0.667, 0.72, 0.8 → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorting by streak ascending", () => {
    render(
      <TooltipProvider>
        <RosterList rikishiList={makeRoster()} onRikishiClick={vi.fn()} />
      </TooltipProvider>
    );
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Streak"));
    const order = getCardOrder();
    // asc: -2, 3, 5 → Bravo, Alpha, Charlie
    expect(order).toEqual(["Bravo", "Alpha", "Charlie"]);
  });

  it("persists sort state to localStorage", () => {
    render(
      <TooltipProvider>
        <RosterList rikishiList={makeRoster()} onRikishiClick={vi.fn()} />
      </TooltipProvider>
    );
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Shikona"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("shikona");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "shikona", order: "desc" }));
    render(
      <TooltipProvider>
        <RosterList rikishiList={makeRoster()} onRikishiClick={vi.fn()} />
      </TooltipProvider>
    );
    const order = getCardOrder();
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});
