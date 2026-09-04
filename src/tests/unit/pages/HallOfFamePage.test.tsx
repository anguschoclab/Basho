import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import HallOfFamePage from "@/pages/HallOfFamePage";

vi.mock("@/contexts/useGame");

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: any) => React.createElement("a", null, children),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: any) => React.createElement("div", null, title),
}));

vi.mock("@/components/ui/EmptyState", () => ({
  EmptyState: () => React.createElement("div", null, "Empty"),
}));

vi.mock("@/components/game/HoFTimeline", () => ({
  HoFTimeline: () => React.createElement("div", null, "Timeline"),
}));

vi.mock("@/presenters/uiDigest", () => ({
  HOF_CATEGORY_LABELS: {
    champion: { name: "Champion", icon: "🏆" },
    iron_man: { name: "Iron Man", icon: "🛡️" },
    technician: { name: "Technician", icon: "🎯" },
  },
  projectHOFUIDigest: () => ({
    inductees: mockInductees,
  }),
}));

vi.mock("@/presenters/worldAccess", () => ({
  getRikishi: () => null,
}));

vi.mock("@/presenters/selectors", () => ({
  selectAwardLog: () => [],
}));

vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name, className }: any) => React.createElement("span", { className }, name),
  StableName: ({ name }: any) => React.createElement("span", null, name),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => React.createElement("div", null, children),
  CardContent: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => React.createElement("span", null, children),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => React.createElement("div", null, children),
  TabsList: ({ children }: any) => React.createElement("div", null, children),
  TabsTrigger: ({ children }: any) => React.createElement("div", null, children),
  TabsContent: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => React.createElement("hr", null),
}));

vi.mock("@/components/avatar/SumoAvatar", () => ({
  SumoAvatar: ({ fallback }: any) => React.createElement("div", null, fallback),
}));

vi.mock("@/constants/ui/navigation", () => ({
  RECORDS_TABS: [],
}));

const STORAGE_KEY = "basho_sort_hof";

let mockInductees: any[] = [];

function makeInductee(id: string, overrides: any = {}): any {
  return {
    rikishiId: id,
    shikona: `Rikishi-${id}`,
    category: "champion",
    inductionYear: 2024,
    heyaName: "TestStable",
    stats: {
      highestRank: "yokozuna",
      yushoCount: 10,
      consecutiveBasho: 50,
      ginoShoCount: 3,
      careerWins: 800,
      careerLosses: 200,
    },
    yushoList: [],
    greatestFights: [],
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

function getInducteeNames(): string[] {
  const names = document.querySelectorAll(".font-display.font-bold.text-lg");
  const seen = new Set<string>();
  const result: string[] = [];
  for (const el of Array.from(names)) {
    const text = el.textContent ?? "";
    if (!seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
  }
  return result;
}

describe("HallOfFamePage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockInductees = [
      makeInductee("i1", {
        shikona: "Charlie",
        inductionYear: 2023,
        stats: { yushoCount: 5, careerWins: 600, careerLosses: 300 },
      }),
      makeInductee("i2", {
        shikona: "Alpha",
        inductionYear: 2024,
        stats: { yushoCount: 15, careerWins: 900, careerLosses: 100 },
      }),
      makeInductee("i3", {
        shikona: "Bravo",
        inductionYear: 2022,
        stats: { yushoCount: 10, careerWins: 750, careerLosses: 250 },
      }),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ year: 2024 });
    render(<HallOfFamePage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by name ascending reorders alphabetically", () => {
    mockUseGame({ year: 2024 });
    render(<HallOfFamePage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Name");
    fireEvent.click(elements[elements.length - 1]);
    const order = getInducteeNames();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by year ascending", () => {
    mockUseGame({ year: 2024 });
    render(<HallOfFamePage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Year");
    fireEvent.click(elements[elements.length - 1]);
    const order = getInducteeNames();
    // asc: 2022, 2023, 2024 → Bravo, Charlie, Alpha
    expect(order).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("sorting by yusho ascending", () => {
    mockUseGame({ year: 2024 });
    render(<HallOfFamePage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Yusho");
    fireEvent.click(elements[elements.length - 1]);
    const order = getInducteeNames();
    // asc: 5, 10, 15 → Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ year: 2024 });
    render(<HallOfFamePage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Name");
    fireEvent.click(elements[elements.length - 1]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("name");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "name", order: "desc" }));
    mockUseGame({ year: 2024 });
    render(<HallOfFamePage />);
    const order = getInducteeNames();
    // desc name: Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});
