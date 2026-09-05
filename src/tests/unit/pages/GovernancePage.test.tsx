import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GovernancePage from "@/pages/GovernancePage";

let mockWorld: any = null;
vi.mock("@/contexts/useGame", () => ({
  useGame: () => ({
    state: { world: mockWorld },
    issueRuling: vi.fn(),
    updateWorld: vi.fn(),
  }),
}));

function setMockWorld(overrides: Record<string, any> = {}) {
  mockWorld = {
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
    ...overrides,
  };
}

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
  ListCard: ({ rows, title, emptyText }: any) =>
    React.createElement(
      "div",
      { "data-testid": "list-card", "data-title": title },
      rows.length === 0
        ? React.createElement("div", { "data-testid": "list-empty" }, emptyText)
        : rows.map((r: any) =>
            React.createElement(
              "div",
              { key: r.id, "data-testid": "faction-row" },
              React.createElement(
                "span",
                { className: "flex-1 min-w-0 font-medium truncate" },
                r.label
              ),
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
    value === "politics" || value === "rulings"
      ? React.createElement("div", { "data-tab": value }, children)
      : null,
  TabsList: ({ children }: any) => React.createElement("div", null, children),
  TabsTrigger: ({ children, value }: any) => React.createElement("button", { value }, children),
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
  getPlayerHeya: (world: any) => {
    const id = world?.playerHeyaId;
    return world?.heyas?.[id] ?? null;
  },
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
  projectGomenfuda: () => ({
    count: 0,
    threshold: 3,
    hasSanctionWarning: false,
    sanctionRiskPercent: 0,
    recentEvents: [],
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
    setMockWorld();
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

describe("GovernancePage — Resolved Rulings filter", () => {
  beforeEach(() => {
    localStorage.clear();
    setMockWorld();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("includes only history rows whose governanceLog entry has playerSeverity", () => {
    setMockWorld({
      heyas: {
        h1: {
          id: "h1",
          name: "Test Stable",
          ichimon: "f1",
          funds: 1000000,
          governanceHistory: [
            { id: "g1", date: "2024-W01", type: "fine", severity: "low", reason: "x" },
            { id: "g2", date: "2024-W02", type: "warning", severity: "low", reason: "y" },
            { id: "g3", date: "2024-W03", type: "fine", severity: "low", reason: "z" },
          ],
          governanceStatus: "good_standing",
        },
      },
      governanceLog: [
        { id: "g1", date: "2024-W01", type: "fine", severity: "low", reason: "x", playerSeverity: "harsh" },
        { id: "g2", date: "2024-W02", type: "warning", severity: "low", reason: "y" },
        { id: "g3", date: "2024-W03", type: "fine", severity: "low", reason: "z", playerSeverity: "lenient" },
      ],
    });
    render(React.createElement(GovernancePage));
    const cards = screen.getAllByTestId("list-card");
    const resolved = cards.find((c) => c.getAttribute("data-title") === "Resolved Rulings");
    expect(resolved).toBeTruthy();
    const rows = resolved!.querySelectorAll("[data-testid='faction-row']");
    // Only g1 and g3 have playerSeverity → 2 rows
    expect(rows.length).toBe(2);
  });

  it("shows empty state when no rulings have playerSeverity", () => {
    setMockWorld({
      heyas: {
        h1: {
          id: "h1",
          name: "Test Stable",
          ichimon: "f1",
          funds: 1000000,
          governanceHistory: [
            { id: "g1", date: "2024-W01", type: "fine", severity: "low", reason: "x" },
          ],
          governanceStatus: "good_standing",
        },
      },
      governanceLog: [
        { id: "g1", date: "2024-W01", type: "fine", severity: "low", reason: "x" },
      ],
    });
    render(React.createElement(GovernancePage));
    const cards = screen.getAllByTestId("list-card");
    const resolved = cards.find((c) => c.getAttribute("data-title") === "Resolved Rulings");
    expect(resolved).toBeTruthy();
    expect(resolved!.querySelector("[data-testid='list-empty']")).toBeTruthy();
  });

  it("handles missing governanceLog gracefully (treated as empty)", () => {
    setMockWorld({
      governanceLog: undefined,
      heyas: {
        h1: {
          id: "h1",
          name: "Test Stable",
          ichimon: "f1",
          funds: 1000000,
          governanceHistory: [
            { id: "g1", date: "2024-W01", type: "fine", severity: "low", reason: "x" },
          ],
          governanceStatus: "good_standing",
        },
      },
    });
    render(React.createElement(GovernancePage));
    const cards = screen.getAllByTestId("list-card");
    const resolved = cards.find((c) => c.getAttribute("data-title") === "Resolved Rulings");
    expect(resolved).toBeTruthy();
    expect(resolved!.querySelector("[data-testid='list-empty']")).toBeTruthy();
  });

  it("uses first-match semantics for duplicate ids in governanceLog (matches Array.find)", () => {
    setMockWorld({
      heyas: {
        h1: {
          id: "h1",
          name: "Test Stable",
          ichimon: "f1",
          funds: 1000000,
          governanceHistory: [
            { id: "g1", date: "2024-W01", type: "fine", severity: "low", reason: "x" },
            { id: "g2", date: "2024-W02", type: "fine", severity: "low", reason: "y" },
          ],
          governanceStatus: "good_standing",
        },
      },
      governanceLog: [
        // g1 first occurrence: no playerSeverity → should be EXCLUDED
        { id: "g1", date: "2024-W01", type: "fine", severity: "low", reason: "x" },
        // g1 duplicate: has playerSeverity → must NOT override the first match
        { id: "g1", date: "2024-W01", type: "fine", severity: "low", reason: "x", playerSeverity: "harsh" },
        // g2 first (and only) occurrence: has playerSeverity → should be INCLUDED
        { id: "g2", date: "2024-W02", type: "fine", severity: "low", reason: "y", playerSeverity: "lenient" },
      ],
    });
    render(React.createElement(GovernancePage));
    const cards = screen.getAllByTestId("list-card");
    const resolved = cards.find((c) => c.getAttribute("data-title") === "Resolved Rulings");
    expect(resolved).toBeTruthy();
    const rows = resolved!.querySelectorAll("[data-testid='faction-row']");
    // Only g2 included (g1's first occurrence lacks playerSeverity)
    expect(rows.length).toBe(1);
  });
});
