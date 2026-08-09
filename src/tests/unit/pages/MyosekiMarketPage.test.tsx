/**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import MyosekiMarketPage from "@/pages/MyosekiMarketPage";

vi.mock("@/contexts/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/store/gameStore", () => ({
  useGameStore: vi.fn(() => vi.fn()),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { useGame } from "@/contexts/useGame";

function makeStock(overrides: Partial<any> = {}): any {
  return {
    id: "stock1",
    name: "Test Stock",
    prestigeTier: "S",
    status: "available",
    askingPrice: 1000,
    ownerId: "JSA",
    ...overrides,
  };
}

function makeMarket(stocks: Record<string, any>): any {
  return {
    stocks,
    history: [],
  };
}

function mockState(world: any) {
  vi.mocked(useGame).mockReturnValue({ state: { world } } as any);
}

describe("MyosekiMarketPage", () => {
  it("shows loading state when no world", () => {
    mockState(null);
    render(<MyosekiMarketPage />);
    expect(screen.getByText("Loading Market Records...")).toBeTruthy();
  });

  it("shows loading state when no myosekiMarket", () => {
    mockState({ heyas: new Map() });
    render(<MyosekiMarketPage />);
    expect(screen.getByText("Loading Market Records...")).toBeTruthy();
  });

  it("disables Buy button when playerFunds < askingPrice", () => {
    const heya = { funds: 500 };
    const world = {
      myosekiMarket: makeMarket({ stock1: makeStock({ askingPrice: 1000 }) }),
      heyas: new Map([["heya1", heya]]),
      playerHeyaId: "heya1",
      rikishi: new Map(),
    };
    mockState(world);
    render(<MyosekiMarketPage />);
    const buyButton = screen.getByText("Buy").closest("button");
    expect(buyButton?.disabled).toBe(true);
  });

  it("enables Buy button when playerFunds >= askingPrice", () => {
    const heya = { funds: 2000 };
    const world = {
      myosekiMarket: makeMarket({ stock1: makeStock({ askingPrice: 1000 }) }),
      heyas: new Map([["heya1", heya]]),
      playerHeyaId: "heya1",
      rikishi: new Map(),
    };
    mockState(world);
    render(<MyosekiMarketPage />);
    const buyButton = screen.getByText("Buy").closest("button");
    expect(buyButton?.disabled).toBe(false);
  });
});

// ── Sorting tests ─────────────────────────────────────────────

const STORAGE_KEY = "basho_sort_myoseki";

function getStockNames(): string[] {
  const titles = document.querySelectorAll(".text-lg");
  return Array.from(titles)
    .map((el) => el.textContent ?? "")
    .filter((t) => t.length > 0);
}

function makeSortWorld(stocks: any[]): any {
  const stockMap: Record<string, any> = {};
  for (const s of stocks) stockMap[s.id] = s;
  return {
    myosekiMarket: { stocks: stockMap, history: [] },
  };
}

describe("MyosekiMarketPage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    mockState(
      makeSortWorld([
        {
          id: "m1",
          name: "Alpha",
          prestigeTier: "elite",
          askingPrice: 1000000,
          status: "available",
          ownerId: "JSA",
        },
      ])
    );
    render(<MyosekiMarketPage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by name ascending reorders alphabetically", () => {
    mockState(
      makeSortWorld([
        {
          id: "m1",
          name: "Charlie",
          prestigeTier: "respected",
          askingPrice: 500000,
          status: "available",
          ownerId: "JSA",
        },
        {
          id: "m2",
          name: "Alpha",
          prestigeTier: "elite",
          askingPrice: 1000000,
          status: "available",
          ownerId: "JSA",
        },
        {
          id: "m3",
          name: "Bravo",
          prestigeTier: "standard",
          askingPrice: 300000,
          status: "available",
          ownerId: "JSA",
        },
      ])
    );
    render(<MyosekiMarketPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Name");
    fireEvent.click(elements[elements.length - 1]);
    const order = getStockNames();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by price ascending", () => {
    mockState(
      makeSortWorld([
        {
          id: "m1",
          name: "Charlie",
          prestigeTier: "respected",
          askingPrice: 500000,
          status: "available",
          ownerId: "JSA",
        },
        {
          id: "m2",
          name: "Alpha",
          prestigeTier: "elite",
          askingPrice: 1000000,
          status: "available",
          ownerId: "JSA",
        },
        {
          id: "m3",
          name: "Bravo",
          prestigeTier: "standard",
          askingPrice: 300000,
          status: "available",
          ownerId: "JSA",
        },
      ])
    );
    render(<MyosekiMarketPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Price");
    fireEvent.click(elements[elements.length - 1]);
    const order = getStockNames();
    // asc: 300k, 500k, 1M → Bravo, Charlie, Alpha
    expect(order).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("persists sort state to localStorage", () => {
    mockState(
      makeSortWorld([
        {
          id: "m1",
          name: "Alpha",
          prestigeTier: "elite",
          askingPrice: 1000000,
          status: "available",
          ownerId: "JSA",
        },
      ])
    );
    render(<MyosekiMarketPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Price");
    fireEvent.click(elements[elements.length - 1]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("price");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "name", order: "desc" }));
    mockState(
      makeSortWorld([
        {
          id: "m1",
          name: "Charlie",
          prestigeTier: "respected",
          askingPrice: 500000,
          status: "available",
          ownerId: "JSA",
        },
        {
          id: "m2",
          name: "Alpha",
          prestigeTier: "elite",
          askingPrice: 1000000,
          status: "available",
          ownerId: "JSA",
        },
        {
          id: "m3",
          name: "Bravo",
          prestigeTier: "standard",
          askingPrice: 300000,
          status: "available",
          ownerId: "JSA",
        },
      ])
    );
    render(<MyosekiMarketPage />);
    const order = getStockNames();
    // desc name: Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});
