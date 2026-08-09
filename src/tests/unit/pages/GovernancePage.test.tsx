import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GovernancePage from "@/pages/GovernancePage";

vi.mock("@/contexts/useGame", () => {
  return {
    useGame: () => {
      return {
        state: {
          world: {
            year: 2024,
            week: 10,
            playerHeyaId: "h1",
            factions: {
              f1: { id: "f1", name: "Alpha Faction", influence: 80, oyakataLeaderId: "o1" },
              f2: { id: "f2", name: "Beta Faction", influence: 50, oyakataLeaderId: "o2" },
              f3: { id: "f3", name: "Gamma Faction", influence: 30, oyakataLeaderId: "o3" },
            },
            heyas: {
              h1: {
                id: "h1",
                name: "Test Stable",
                ichimon: "f1",
                funds: 1000000,
                governanceHistory: [],
                governanceStatus: "good_standing",
              },
            },
            governanceLog: [],
            closedHeyas: [],
            yokozunaVacancyStreak: 0,
          },
        },
        issueRuling: vi.fn(),
        updateWorld: vi.fn(),
      };
    },
  };
});

vi.mock("@/store/gameStore", () => ({
  useGameStore: () => ({ sendCommand: vi.fn() }),
}));

vi.mock("@/hooks/useRequireWorld", () => ({
  useRequireWorld: () => true,
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: any) => React.createElement("div", null, title),
  StatCard: ({ label, value }: any) => React.createElement("div", null, label, ": ", String(value)),
  ListCard: ({ rows }: any) =>
    React.createElement(
      "div",
      { "data-testid": "faction-list" },
      rows.map((r: any) =>
        React.createElement(
          "div",
          { key: r.id, "data-testid": "faction-row" },
          React.createElement("span", { className: "flex-1 min-w-0 font-medium truncate" }, r.label),
          r.value !== undefined &&
            React.createElement("span", { className: "font-mono font-bold" }, String(r.value))
        )
      )
    ),
  SectionHeader: ({ title }: any) => React.createElement("div", null, title),
}));

vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => React.createElement("div", null, children),
  CardContent: ({ children }: any) => React.createElement("div", null, children),
  CardDescription: ({ children }: any) => React.createElement("div", null, children),
  CardHeader: ({ children }: any) => React.createElement("div", null, children),
  CardTitle: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }: any) =>
    React.createElement("div", { "data-default-value": defaultValue }, children),
  TabsContent: ({ children, value }: any) =>
    value === "politics" ? React.createElement("div", null, children) : null,
  TabsList: ({ children }: any) => React.createElement("div", null, children),
  TabsTrigger: ({ children, value }: any) =>
    React.createElement("button", { value }, children),
}));

vi.mock("@/presenters/uiDigest", () => ({
  SCANDAL_LABELS: { low: "Low", medium: "Medium", high: "High" },
  formatFinePenalty: (n: number) => `¥${n}`,
  getStatusLabel: () => "Good Standing",
  spendPoliticalCapital: vi.fn(),
}));

vi.mock("@/engine/core/ImpactResolver", () => ({
  resolveImpacts: vi.fn(() => []),
}));

vi.mock("@/engine/queries", () => ({
  getPlayerHeya: (_world: any, id: string) => ({
    id,
    name: "Test Stable",
    ichimon: "f1",
    funds: 1_000_000,
    governanceHistory: [],
    governanceStatus: "good_standing",
  }),
}));

vi.mock("@/presenters/projections/governanceProjections", () => ({
  projectGovernanceDerived: (_world: any, _heya: any) => ({
    status: "good_standing",
    scandal: 0,
    scandalBand: "low",
    scandalTone: "success",
    welfareLabel: "Safe",
    welfareTone: "success",
    welfareRisk: 10,
    compState: "compliant",
    compTone: "success",
    statusTone: "default",
    statusSub: "",
    unresolvedRulings: [],
    pendingRulings: [],
    criticalHeyas: [],
    mergerCandidates: [],
    completedMergerEvents: [],
    factionList: [
      { id: "f1", name: "Alpha Faction", influence: 80, oyakataLeaderId: "o1" },
      { id: "f2", name: "Beta Faction", influence: 50, oyakataLeaderId: "o2" },
      { id: "f3", name: "Gamma Faction", influence: 30, oyakataLeaderId: "o3" },
    ],
  }),
}));

vi.mock("@/presenters/selectors", () => ({
  selectClosedHeyas: () => [],
  selectYokozunaVacancyStreak: () => 0,
}));

vi.mock("@/presenters/worldAccess", () => ({
  getOyakata: () => ({ name: "Oyakata Name" }),
  getGlobalCupChampion: () => null,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => React.createElement("span", null, children),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement("button", { onClick, ...props }, children),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: any) => React.createElement("a", null, children),
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

const STORAGE_KEY = "basho_sort_governance_faction";

function getFirstText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  for (const child of Array.from(node.childNodes)) {
    const text = getFirstText(child);
    if (text) return text;
  }
  return "";
}

function getFactionNames(): string[] {
  const rows = document.querySelectorAll("[data-testid='faction-row']");
  return Array.from(rows).map((r) => {
    const span = r.querySelector(".flex-1.min-w-0.font-medium.truncate");
    if (!span) return "";
    return getFirstText(span).trim();
  });
}

describe("GovernancePage faction sorting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders SortMenu control for faction rankings", () => {
    render(React.createElement(GovernancePage));
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("defaults to influence descending (Alpha, Beta, Gamma)", () => {
    render(React.createElement(GovernancePage));
    const order = getFactionNames();
    expect(order).toEqual(["Alpha Faction", "Beta Faction", "Gamma Faction"]);
  });

  it("sorting by name descending reorders reverse-alphabetically", () => {
    render(React.createElement(GovernancePage));
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Name"));
    const order = getFactionNames();
    // desc: Gamma, Beta, Alpha
    expect(order).toEqual(["Gamma Faction", "Beta Faction", "Alpha Faction"]);
  });

  it("persists sort state to localStorage", () => {
    render(React.createElement(GovernancePage));
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getByText("Name"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("name");
    expect(stored.order).toBe("desc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "name", order: "asc" }));
    render(React.createElement(GovernancePage));
    const order = getFactionNames();
    // asc: Alpha, Beta, Gamma
    expect(order).toEqual(["Alpha Faction", "Beta Faction", "Gamma Faction"]);
  });
});
