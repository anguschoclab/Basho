import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import OyakataPage from "@/pages/OyakataPage";

vi.mock("@/contexts/useGame");

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: any) => React.createElement("div", null, title),
}));


vi.mock("@/components/kesho/keshoComponents", () => ({
  YokozunaTsunaDisplay: () => React.createElement("div", null, "Tsuna"),
}));

vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: any) => React.createElement("span", null, name),
  StableName: ({ name }: any) => React.createElement("span", null, name),
}));

vi.mock("@/engine/lineage", () => ({
  menteesOf: () => [],
}));

vi.mock("@/engine/queries", () => ({
  getPlayerHeya: () => ({ id: "h1", name: "TestHeya", oyakataId: "o1", rikishiIds: [] }),
}));

vi.mock("@/presenters/worldAccess", () => ({
  getOyakata: (_world: any, id: string) => mockOyakata.find((o) => o.id === id),
  getHeya: (_world: any, id: string) => ({ id, name: `Stable-${id}` }),
  getRikishi: () => null,
  getAllOyakata: () => mockOyakata,
}));

vi.mock("@/presenters/uiDigest", () => ({
  TRAIT_LABELS: { low: "Low", mid: "Mid", high: "High" },
  toTraitBand: (v: number) => (v < 33 ? "low" : v < 66 ? "mid" : "high"),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => React.createElement("div", null, children),
  CardContent: ({ children }: any) => React.createElement("div", null, children),
  CardDescription: ({ children }: any) => React.createElement("div", null, children),
  CardHeader: ({ children }: any) => React.createElement("div", null, children),
  CardTitle: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => React.createElement("span", null, children),
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: any) => React.createElement("div", { "data-value": value }),
}));

vi.mock("@/components/avatar/SumoAvatar", () => ({
  SumoAvatar: ({ fallback }: any) => React.createElement("div", null, fallback),
}));

vi.mock("@/constants/ui/navigation", () => ({
  STABLE_TABS: [],
}));

const STORAGE_KEY = "basho_sort_oyakata";

let mockOyakata: any[] = [];

function makeOyakata(id: string, overrides: any = {}): any {
  return {
    id,
    name: `Oyakata-${id}`,
    archetype: "test",
    age: 50,
    yearsInCharge: 10,
    heyaId: `h_${id}`,
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world, playerHeyaId: "h1" },
  } as any);
}

function getOyakataNames(): string[] {
  const names = document.querySelectorAll(".font-medium");
  return Array.from(names)
    .map((el) => el.textContent ?? "")
    .filter((t) => t === "Alpha" || t === "Bravo" || t === "Charlie");
}

describe("OyakataPage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOyakata = [
      makeOyakata("o1", { name: "Charlie", age: 60, yearsInCharge: 20 }),
      makeOyakata("o2", { name: "Alpha", age: 45, yearsInCharge: 5 }),
      makeOyakata("o3", { name: "Bravo", age: 55, yearsInCharge: 15 }),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OyakataPage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by name ascending reorders alphabetically", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OyakataPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Name");
    fireEvent.click(elements[elements.length - 1]);
    const order = getOyakataNames();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by age ascending", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OyakataPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Age");
    fireEvent.click(elements[elements.length - 1]);
    const order = getOyakataNames();
    // asc: 45, 55, 60 → Alpha, Bravo, Charlie
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by tenure ascending", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OyakataPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Tenure");
    fireEvent.click(elements[elements.length - 1]);
    const order = getOyakataNames();
    // asc: 5, 15, 20 → Alpha, Bravo, Charlie
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<OyakataPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Age");
    fireEvent.click(elements[elements.length - 1]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("age");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "name", order: "desc" }));
    mockUseGame({ playerHeyaId: "h1" });
    render(<OyakataPage />);
    const order = getOyakataNames();
    // desc name: Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});
