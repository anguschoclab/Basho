import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import RivalriesPage from "@/pages/RivalriesPage";

vi.mock("@/contexts/useGame");

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: any) => React.createElement("div", null, title),
}));

vi.mock("react-helmet", () => ({
  Helmet: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/rivalries/RivalriesHeader", () => ({
  RivalriesHeader: () => React.createElement("div", null, "Header"),
}));

vi.mock("@/components/rivalries/RivalryCard", () => ({
  RivalryCard: ({ pair }: any) =>
    React.createElement(
      "div",
      { "data-testid": "rivalry-card", "data-heat": pair.heat },
      `${pair.aName || "A"} vs ${pair.bName || "B"}`
    ),
}));

vi.mock("@/components/rivalries/RivalriesEmptyState", () => ({
  RivalriesEmptyState: () => React.createElement("div", null, "Empty"),
}));

vi.mock("@/components/rivalries/HeatLegend", () => ({
  HeatLegend: () => React.createElement("div", null, "Legend"),
}));

vi.mock("@/engine/rivalries", () => ({
  createDefaultRivalriesState: () => ({ pairs: {} }),
}));

vi.mock("@/engine/queries", () => ({
  getPlayerHeya: () => ({ id: "h1", name: "TestHeya", rikishiIds: ["r1"] }),
}));

vi.mock("@/presenters/projections/rivalriesProjections", () => ({
  projectRivalriesPage: () => ({ stableRivalries: [] }),
}));

vi.mock("@/engine/descriptorBands", () => ({
  toRivalryHeatBand: (v: number) => (v >= 80 ? "inferno" : v >= 55 ? "hot" : "cool"),
}));

vi.mock("@/constants/ui/labels", () => ({
  RIVALRY_HEAT_LABELS: { inferno: "Inferno", hot: "Hot", cool: "Cool" },
}));

const STORAGE_KEY = "basho_sort_rivalries";

function makePair(key: string, overrides: any = {}): any {
  return {
    key,
    aId: `a_${key}`,
    bId: `b_${key}`,
    aName: `Rikishi-A-${key}`,
    bName: `Rikishi-B-${key}`,
    heat: 50,
    aWins: 3,
    bWins: 2,
    triggers: {},
    tone: "respect",
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world, playerHeyaId: "h1" },
  } as any);
}

function getCardTexts(): string[] {
  const cards = document.querySelectorAll("[data-testid='rivalry-card']");
  return Array.from(cards).map((el) => el.textContent ?? "");
}

describe("RivalriesPage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    const pairs: Record<string, any> = {
      p1: makePair("p1", { aName: "Alpha", bName: "Beta", heat: 60 }),
    };
    mockUseGame({
      rivalriesState: { pairs },
      rikishi: new Map([
        ["a_p1", { shikona: "Alpha" }],
        ["b_p1", { shikona: "Beta" }],
      ]),
    });
    render(<RivalriesPage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by heat ascending reorders correctly", () => {
    const pairs: Record<string, any> = {
      p1: makePair("p1", { aName: "Charlie", bName: "Delta", heat: 50 }),
      p2: makePair("p2", { aName: "Alpha", bName: "Beta", heat: 10 }),
      p3: makePair("p3", { aName: "Echo", bName: "Foxtrot", heat: 30 }),
    };
    mockUseGame({
      rivalriesState: { pairs },
      rikishi: new Map(),
    });
    render(<RivalriesPage />);
    const order = getCardTexts();
    // asc heat: 10, 30, 50 → Alpha vs Beta, Echo vs Foxtrot, Charlie vs Delta
    expect(order).toEqual(["Alpha vs Beta", "Echo vs Foxtrot", "Charlie vs Delta"]);
  });

  it("persists sort state to localStorage", () => {
    const pairs: Record<string, any> = {
      p1: makePair("p1", { aName: "Alpha", bName: "Beta", heat: 60 }),
    };
    mockUseGame({
      rivalriesState: { pairs },
      rikishi: new Map(),
    });
    render(<RivalriesPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Wins");
    fireEvent.click(elements[elements.length - 1]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("wins");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "heat", order: "desc" }));
    const pairs: Record<string, any> = {
      p1: makePair("p1", { aName: "Charlie", bName: "Delta", heat: 70 }),
      p2: makePair("p2", { aName: "Alpha", bName: "Beta", heat: 30 }),
      p3: makePair("p3", { aName: "Echo", bName: "Foxtrot", heat: 50 }),
    };
    mockUseGame({
      rivalriesState: { pairs },
      rikishi: new Map(),
    });
    render(<RivalriesPage />);
    const order = getCardTexts();
    // desc heat: 70, 50, 30 → Charlie vs Delta, Echo vs Foxtrot, Alpha vs Beta
    expect(order).toEqual(["Charlie vs Delta", "Echo vs Foxtrot", "Alpha vs Beta"]);
  });
});
