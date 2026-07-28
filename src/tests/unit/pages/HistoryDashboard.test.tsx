import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { HistoryDashboard } from "@/pages/HistoryDashboard";
import * as GameContext from "@/contexts/GameContext";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title, lede }: { title: string; lede?: string }) => (
    <header data-testid="page-header">
      <h1>{title}</h1>
      {lede && <p>{lede}</p>}
    </header>
  ),
}));

vi.mock("@/presenters/selectors", () => ({
  selectRetiredRikishi: vi.fn(() => []),
}));

vi.mock("@/components/ui/tabs", () => {
  const React = require("react");
  const TabsContext = React.createContext({ value: "", onValueChange: (_v: string) => {} });

  const Tabs = ({ value: initialValue, onValueChange, children, ...props }: any) => {
    const [value, setValue] = React.useState(initialValue);
    const handleChange = (v: string) => {
      setValue(v);
      onValueChange?.(v);
    };
    return React.createElement(
      TabsContext.Provider,
      { value: { value, onValueChange: handleChange } },
      React.createElement("div", props, children)
    );
  };

  const TabsList = ({ children, ...props }: any) =>
    React.createElement("div", { role: "tablist", ...props }, children);

  const TabsTrigger = ({ value, children, ...props }: any) => {
    const ctx = React.useContext(TabsContext);
    return React.createElement(
      "button",
      {
        role: "tab",
        "data-value": value,
        "data-state": ctx.value === value ? "active" : "inactive",
        onClick: () => ctx.onValueChange(value),
        ...props,
      },
      children
    );
  };

  const TabsContent = ({ value, children, ...props }: any) => {
    const ctx = React.useContext(TabsContext);
    if (ctx.value !== value) return null;
    return React.createElement(
      "div",
      { role: "tabpanel", "data-value": value, ...props },
      children
    );
  };

  return { Tabs, TabsList, TabsTrigger, TabsContent };
});

import { selectRetiredRikishi } from "@/presenters/selectors";

// ── Helpers ────────────────────────────────────────────────

function makeRecordEntry(rikishiId: string, shikona: string, value: number) {
  return { rikishiId, shikona, value, achievedDate: { year: 2024, month: 1 } };
}

function makeRikishi(id: string, shikona: string, heyaId: string, rank?: string) {
  return { id, shikona, heyaId, rank } as any;
}

function makeTenure(
  generation: number,
  name: string,
  startYear: number,
  endYear?: number,
  sekitoriCount?: number,
  titlesWon?: number
) {
  return {
    generation,
    name,
    startYear,
    endYear,
    achievements:
      sekitoriCount !== undefined || titlesWon !== undefined
        ? { sekitoriCount, titlesWon }
        : undefined,
  };
}

function makeHeya(id: string, name: string, nameJa?: string, lineage: any[] = []) {
  return { id, name, nameJa, lineage } as any;
}

function makeWorld(overrides: Record<string, any> = {}) {
  return {
    records: {
      allTime: {
        careerWins: [],
        makuuchiWins: [],
        yusho: [],
        consecutiveYusho: [],
        kinboshi: [],
      },
    },
    heyas: new Map(),
    historicalRikishi: new Map(),
    ...overrides,
  } as any;
}

function mockUseGame(world: any) {
  vi.spyOn(GameContext, "useGame").mockReturnValue({
    state: { world },
  } as any);
}

// ── Tests ──────────────────────────────────────────────────

describe("HistoryDashboard — no world", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders Museum Unavailable card when world is null", () => {
    mockUseGame(null);
    render(<HistoryDashboard />);
    expect(screen.getByText("Museum Unavailable")).toBeTruthy();
    expect(screen.getByText("No world loaded. Start a game to explore the archives.")).toBeTruthy();
    expect(screen.queryByText("Museum of Sumo")).toBeNull();
  });
});

describe("HistoryDashboard — Records tab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders PageHeader with correct title and lede when world is loaded", () => {
    mockUseGame(makeWorld());
    render(<HistoryDashboard />);
    expect(screen.getByText("Museum of Sumo")).toBeTruthy();
    expect(
      screen.getByText(
        "Preserving the legacy of the Dohyo — records, stables, and the history of the world."
      )
    ).toBeTruthy();
  });

  it("renders all 4 leaderboard category cards by name", () => {
    mockUseGame(makeWorld());
    render(<HistoryDashboard />);
    expect(screen.getByText("All-Time Wins")).toBeTruthy();
    expect(screen.getByText("Top Division Yusho")).toBeTruthy();
    expect(screen.getByText("Consecutive Wins")).toBeTruthy();
    expect(screen.getByText("Kinboshi Collectors")).toBeTruthy();
  });

  it("shows empty state message when all record categories are empty", () => {
    mockUseGame(makeWorld({ records: undefined }));
    render(<HistoryDashboard />);
    const empty = screen.getAllByText("No records yet recorded...");
    expect(empty).toHaveLength(4);
  });

  it("shows empty state for individual empty categories while displaying populated ones", () => {
    mockUseGame(
      makeWorld({
        records: {
          allTime: {
            careerWins: [
              makeRecordEntry("r1", "Hakuho", 1044),
              makeRecordEntry("r2", "Kakuryu", 800),
            ],
            makuuchiWins: [],
            yusho: [],
            consecutiveYusho: [],
            kinboshi: [],
          },
        },
      })
    );
    render(<HistoryDashboard />);
    expect(screen.getByText("Hakuho")).toBeTruthy();
    expect(screen.getByText("Kakuryu")).toBeTruthy();
    const empty = screen.getAllByText("No records yet recorded...");
    expect(empty).toHaveLength(3);
  });

  it("renders record entry shikona and value badge", () => {
    mockUseGame(
      makeWorld({
        records: {
          allTime: {
            careerWins: [makeRecordEntry("r1", "Hakuho", 1044)],
            makuuchiWins: [],
            yusho: [],
            consecutiveYusho: [],
            kinboshi: [],
          },
        },
      })
    );
    render(<HistoryDashboard />);
    expect(screen.getByText("Hakuho")).toBeTruthy();
    expect(screen.getByText("1044")).toBeTruthy();
  });

  it("caps leaderboard display at top 5 entries", () => {
    const entries = Array.from({ length: 7 }, (_, i) =>
      makeRecordEntry(`r${i}`, `R${i + 1}`, 100 - i)
    );
    mockUseGame(
      makeWorld({
        records: {
          allTime: {
            careerWins: entries,
            makuuchiWins: [],
            yusho: [],
            consecutiveYusho: [],
            kinboshi: [],
          },
        },
      })
    );
    render(<HistoryDashboard />);
    for (let i = 1; i <= 5; i++) expect(screen.getByText(`R${i}`)).toBeTruthy();
    expect(screen.queryByText("R6")).toBeNull();
    expect(screen.queryByText("R7")).toBeNull();
  });

  it("renders exactly 5 entries when 5 are provided", () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeRecordEntry(`r${i}`, `R${i + 1}`, 100 - i)
    );
    mockUseGame(
      makeWorld({
        records: {
          allTime: {
            careerWins: entries,
            makuuchiWins: [],
            yusho: [],
            consecutiveYusho: [],
            kinboshi: [],
          },
        },
      })
    );
    render(<HistoryDashboard />);
    for (let i = 1; i <= 5; i++) expect(screen.getByText(`R${i}`)).toBeTruthy();
  });

  it("handles duplicate rikishiId entries without key collisions", () => {
    mockUseGame(
      makeWorld({
        records: {
          allTime: {
            careerWins: [],
            makuuchiWins: [],
            yusho: [makeRecordEntry("r1", "Hakuho I", 10), makeRecordEntry("r1", "Hakuho II", 8)],
            consecutiveYusho: [],
            kinboshi: [],
          },
        },
      })
    );
    render(<HistoryDashboard />);
    expect(screen.getByText("Hakuho I")).toBeTruthy();
    expect(screen.getByText("Hakuho II")).toBeTruthy();
  });
});

describe("HistoryDashboard — Stables tab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("switches to Stables tab on trigger click", () => {
    mockUseGame(makeWorld({ heyas: new Map([["h1", makeHeya("h1", "Kokonoe")]]) }));
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("Stable Lineages")).toBeTruthy();
    expect(screen.getByText("Retired Legends")).toBeTruthy();
  });

  it("renders heya nameJa when available", () => {
    mockUseGame(
      makeWorld({
        heyas: new Map([["h1", makeHeya("h1", "Kokonoe", "九重部屋")]]),
      })
    );
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("九重部屋")).toBeTruthy();
  });

  it("falls back to heya.name when nameJa is absent", () => {
    mockUseGame(makeWorld({ heyas: new Map([["h1", makeHeya("h1", "Kokonoe")]]) }));
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("Kokonoe")).toBeTruthy();
  });

  it("renders lineage tenure cards with generation, name, and year range", () => {
    mockUseGame(
      makeWorld({
        heyas: new Map([
          [
            "h1",
            makeHeya("h1", "Chiganoura", undefined, [
              makeTenure(1, "Chiganoura", 1950, 1980, 3, 2),
              makeTenure(2, "Chiganoura II", 1980, undefined, 1, 0),
            ]),
          ],
        ]),
      })
    );
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("Generation 1")).toBeTruthy();
    expect(screen.getByText("Generation 2")).toBeTruthy();
    expect(screen.getAllByText("Chiganoura").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Chiganoura II")).toBeTruthy();
    expect(screen.getByText("1950 — 1980")).toBeTruthy();
    expect(screen.getByText("1980 — Present")).toBeTruthy();
  });

  it("renders 0 for missing tenure achievements", () => {
    mockUseGame(
      makeWorld({
        heyas: new Map([
          ["h1", makeHeya("h1", "Test", undefined, [makeTenure(1, "Test", 2000, 2010)])],
        ]),
      })
    );
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    const sekitori = screen.getByText("Sekitori:");
    expect(sekitori.parentElement?.textContent).toContain("0");
    const titles = screen.getByText("Titles:");
    expect(titles.parentElement?.textContent).toContain("0");
  });

  it("renders 0 for partial tenure achievements (sekitoriCount present, titlesWon missing)", () => {
    mockUseGame(
      makeWorld({
        heyas: new Map([
          [
            "h1",
            makeHeya("h1", "Test", undefined, [makeTenure(1, "Test", 2000, 2010, 5, undefined)]),
          ],
        ]),
      })
    );
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    const sekitori = screen.getByText("Sekitori:");
    expect(sekitori.parentElement?.textContent).toContain("5");
    const titles = screen.getByText("Titles:");
    expect(titles.parentElement?.textContent).toContain("0");
  });

  it("renders empty heya with no lineage gracefully", () => {
    mockUseGame(makeWorld({ heyas: new Map([["h1", makeHeya("h1", "Empty")]]) }));
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("Empty")).toBeTruthy();
    expect(screen.queryByText(/Generation/)).toBeNull();
  });

  it("renders retired legends with shikona, rank, and heya name", () => {
    mockUseGame(
      makeWorld({
        heyas: new Map([["h1", makeHeya("h1", "Miyagino")]]),
      })
    );
    vi.mocked(selectRetiredRikishi).mockReturnValue([
      makeRikishi("r1", "Hakuho", "h1", "yokozuna"),
      makeRikishi("r2", "Kakuryu", "h1", "yokozuna"),
    ]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("Hakuho")).toBeTruthy();
    expect(screen.getByText("Kakuryu")).toBeTruthy();
    expect(screen.getAllByText("yokozuna").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Miyagino").length).toBeGreaterThanOrEqual(1);
  });

  it("shows — for retired rikishi with no rank", () => {
    mockUseGame(makeWorld({ heyas: new Map([["h1", makeHeya("h1", "Test")]]) }));
    vi.mocked(selectRetiredRikishi).mockReturnValue([
      makeRikishi("r1", "Unknown", "h1", undefined),
    ]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("falls back to raw heyaId when heya not found in heyas map", () => {
    mockUseGame(makeWorld({ heyas: new Map() }));
    vi.mocked(selectRetiredRikishi).mockReturnValue([
      makeRikishi("r1", "Test", "missing-heya", "ozeki"),
    ]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("missing-heya")).toBeTruthy();
  });

  it("shows empty state when no retired rikishi exist", () => {
    mockUseGame(makeWorld({ heyas: new Map([["h1", makeHeya("h1", "Test")]]) }));
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("No retirements on record yet.")).toBeTruthy();
  });

  it("caps retired legends at 40 entries", () => {
    mockUseGame(makeWorld({ heyas: new Map([["h1", makeHeya("h1", "Test")]]) }));
    const retired = Array.from({ length: 45 }, (_, i) =>
      makeRikishi(`r${i}`, `R${i}`, "h1", "yokozuna")
    );
    vi.mocked(selectRetiredRikishi).mockReturnValue(retired);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    for (let i = 0; i <= 39; i++) expect(screen.getByText(`R${i}`)).toBeTruthy();
    for (let i = 40; i <= 44; i++) expect(screen.queryByText(`R${i}`)).toBeNull();
  });
});

describe("HistoryDashboard — tab switching", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Records tab is active by default and Stables content is not rendered", () => {
    mockUseGame(makeWorld());
    render(<HistoryDashboard />);
    expect(screen.getByText("All-Time Wins")).toBeTruthy();
    expect(screen.queryByText("Stable Lineages")).toBeNull();
  });

  it("switches back to Records tab from Stables tab", () => {
    mockUseGame(makeWorld({ heyas: new Map([["h1", makeHeya("h1", "Test")]]) }));
    vi.mocked(selectRetiredRikishi).mockReturnValue([]);
    render(<HistoryDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "Stables" }));
    expect(screen.getByText("Stable Lineages")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Records" }));
    expect(screen.getByText("All-Time Wins")).toBeTruthy();
    expect(screen.queryByText("Stable Lineages")).toBeNull();
  });
});
