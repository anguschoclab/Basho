/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MyosekiMarketPage from "@/pages/MyosekiMarketPage";

vi.mock("@/contexts/GameContext", () => ({
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

import { useGame } from "@/contexts/GameContext";

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
