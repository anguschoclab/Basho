import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import HistoryPage from "@/pages/HistoryPage";
import * as GameContext from "@/contexts/useGame";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
  StableName: ({ name }: { name: string }) => <span>{name}</span>,
}));


vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/presenters/uiDigest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/presenters/uiDigest")>();
  return {
    ...actual,
    getBashoIndex: () => 0,
  };
});

describe("HistoryPage", () => {
  beforeEach(() => {
    // Ensure document.body exists for @testing-library/react
    if (!document.body) {
      document.body = document.createElement("body");
    }
  });

  it("renders correctly with no world", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world: null },
      getRikishi: vi.fn(),
    } as any);

    const { container } = render(<HistoryPage />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly with empty history", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world: { history: [] } },
      getRikishi: vi.fn(),
    } as any);

    render(<HistoryPage />);
    expect(screen.queryByText("No History Yet")).toBeTruthy();
  });

  it("renders correctly with partial history record (guard checks)", () => {
    const mockWorld = {
      history: [
        {
          year: 2024,
          bashoNumber: 1,
          // Missing bashoName intentionally to test fallback
          yusho: "r1",
          // Missing junYusho
          // Missing prizes
        },
      ],
      heyas: new Map([["h1", { id: "h1", name: "Mock Stable" }]]),
    };

    const mockRikishi = {
      id: "r1",
      shikona: "Mockyama",
      rank: 1,
      heyaId: "h1",
    };

    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world: mockWorld },
      getRikishi: () => mockRikishi,
    } as any);

    render(<HistoryPage />);

    // Check fallback basho name logic (should use default properties when bashoName is missing but getBashoByNumber handles the number)
    expect(screen.queryByText("初場所")).toBeTruthy(); // 1 = Hatsu / 初場所

    // Check winner is shown
    expect(screen.queryByText("Mockyama")).toBeTruthy();
    expect(screen.queryByText("Mock Stable")).toBeTruthy();

    // Check missing Jun-Yusho guard renders dash
    expect(screen.queryByText("—", { selector: ".text-sm.text-muted-foreground" })).toBeTruthy();
  });

  it("handles missing rank in RANK_HIERARCHY gracefully", () => {
    const mockWorld = {
      history: [
        {
          year: 2024,
          bashoNumber: 1,
          yusho: "r1",
        },
      ],
      heyas: new Map([["h1", { id: "h1", name: "Mock Stable" }]]),
    };

    // Provide a non-existent rank to test safeRankJa guard
    const mockRikishi = {
      id: "r1",
      shikona: "Mockyama",
      rank: 99999,
      heyaId: "h1",
    };

    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world: mockWorld },
      getRikishi: () => mockRikishi,
    } as any);

    render(<HistoryPage />);

    // Should fallback to stringified rank
    expect(screen.queryByText(/99999/)).toBeTruthy();
  });
});

// ── Sorting tests ─────────────────────────────────────────────

const STORAGE_KEY = "basho_sort_history";

function getHistoryCardTitles(): string[] {
  const titles = document.querySelectorAll(".font-display.text-2xl");
  return Array.from(titles)
    .map((el) => {
      const first = el.childNodes[0];
      return first?.textContent ?? "";
    })
    .filter((t) => t.length > 0);
}

describe("HistoryPage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: {
        world: {
          history: [{ year: 2024, bashoNumber: 1, bashoName: "Hatsu", yusho: "r1" }],
          heyas: new Map([["h1", { id: "h1", name: "Stable" }]]),
        },
      },
      getRikishi: () => ({ id: "r1", shikona: "Test", rank: "yokozuna", heyaId: "h1" }),
    } as any);

    render(<HistoryPage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by year ascending reorders correctly", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: {
        world: {
          history: [
            { year: 2024, bashoNumber: 0, bashoName: "Hatsu", yusho: "r1" },
            { year: 2022, bashoNumber: 0, bashoName: "Aki", yusho: "r2" },
            { year: 2023, bashoNumber: 0, bashoName: "Kyushu", yusho: "r3" },
          ],
          heyas: new Map([["h1", { id: "h1", name: "Stable" }]]),
        },
      },
      getRikishi: (id: string) => ({ id, shikona: `R-${id}`, rank: "yokozuna", heyaId: "h1" }),
    } as any);

    render(<HistoryPage />);
    const order = getHistoryCardTitles();
    // asc year: 2022, 2023, 2024 → Aki, Kyushu, Hatsu
    expect(order).toEqual(["Aki", "Kyushu", "Hatsu"]);
  });

  it("persists sort state to localStorage", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: {
        world: {
          history: [{ year: 2024, bashoNumber: 0, bashoName: "Hatsu", yusho: "r1" }],
          heyas: new Map([["h1", { id: "h1", name: "Stable" }]]),
        },
      },
      getRikishi: () => ({ id: "r1", shikona: "Test", rank: "yokozuna", heyaId: "h1" }),
    } as any);

    render(<HistoryPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Basho");
    fireEvent.click(elements[elements.length - 1]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("basho");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "year", order: "desc" }));
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: {
        world: {
          history: [
            { year: 2024, bashoNumber: 0, bashoName: "Hatsu", yusho: "r1" },
            { year: 2022, bashoNumber: 0, bashoName: "Aki", yusho: "r2" },
            { year: 2023, bashoNumber: 0, bashoName: "Kyushu", yusho: "r3" },
          ],
          heyas: new Map([["h1", { id: "h1", name: "Stable" }]]),
        },
      },
      getRikishi: (id: string) => ({ id, shikona: `R-${id}`, rank: "yokozuna", heyaId: "h1" }),
    } as any);

    render(<HistoryPage />);
    const order = getHistoryCardTitles();
    // desc year: 2024, 2023, 2022 → Hatsu, Kyushu, Aki
    expect(order).toEqual(["Hatsu", "Kyushu", "Aki"]);
  });
});
