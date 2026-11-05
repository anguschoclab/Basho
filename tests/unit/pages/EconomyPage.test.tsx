import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/state/game/useGame";
import EconomyPage from "@/pages/EconomyPage";

vi.mock("@/state/game/useGame");

vi.mock("@/state/stores/gameStore", () => ({
  useGameStore: () => ({ sendCommand: vi.fn() }),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/layout/page-shell/index", () => ({
  PageHeader: ({ title }: any) => React.createElement("div", null, title),
}));

vi.mock("@/components/ui/EmptyState", () => ({
  EmptyState: () => React.createElement("div", null, "Loading"),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockGetPlayerHeya = vi.fn(() => ({
  id: "h1",
  name: "TestHeya",
  funds: 1000000,
  runwayBand: "stable",
  rikishiIds: ["r1", "r2", "r3"],
  oyakataId: "o1",
}));

vi.mock("@/engine/core/queries", () => ({
  getPlayerHeya: () => mockGetPlayerHeya(),
}));

vi.mock("@/presenters/worldAccess", () => ({
  getRikishi: (_world: any, id: string) => mockRikishi.find((r) => r.id === id),
}));

vi.mock("@/engine/economy/FinanceCalculator", () => ({
  calculateHeyaWeeklyFinances: () => ({ income: 100, expenses: 50, net: 50 }),
}));

vi.mock("@/components/economy/economyUtils", () => ({
  safeRunwayBand: (v: string) => v,
  safeKoenkaiBand: (v: string) => v,
}));

vi.mock("@/constants/engine/rankDisplay", () => ({
  isSekitoriDivision: (d: string) => d === "makuuchi" || d === "juryo",
}));

vi.mock("@/components/economy/FinancialHealthOverview", () => ({
  FinancialHealthOverview: () => React.createElement("div", null, "Health"),
}));

vi.mock("@/components/economy/BailoutCard", () => ({
  BailoutCard: ({ canRequestBailout }: any) =>
    React.createElement("div", {
      "data-testid": "bailout-card",
      "data-can-request": String(canRequestBailout),
    }),
}));

vi.mock("@/components/economy/DebtSection", () => ({
  DebtSection: () => React.createElement("div", null, "Debt"),
}));

vi.mock("@/components/economy/KoenkaiSekitoriCards", () => ({
  KoenkaiSekitoriCards: () => React.createElement("div", null, "Koenkai"),
}));

vi.mock("@/components/economy/SponsorsPanel", () => ({
  SponsorsPanel: () => React.createElement("div", null, "Sponsors"),
}));

vi.mock("@/components/stable/StableHealthPanel", () => ({
  StableHealthPanel: () => React.createElement("div", null, "Stable Health"),
}));

vi.mock("@/presenters/projections/heyaProjections", () => ({
  projectHeyaData: () => ({ oyakata: {}, oyakataQuirks: [], oyakataTraits: [] }),
}));

vi.mock("@/components/economy/FinancialTrendsChart", () => ({
  FinancialTrendsChart: () => React.createElement("div", null, "Chart"),
}));

vi.mock("@/components/economy/IncomeExpensesCards", () => ({
  IncomeExpensesCards: () => React.createElement("div", null, "Income"),
}));

vi.mock("@/components/economy/SponsorDrawCard", () => ({
  SponsorDrawCard: ({ topEarners }: any) =>
    React.createElement(
      "div",
      { "data-testid": "sponsor-draw" },
      topEarners.map((r: any) =>
        React.createElement("div", { key: r.id, "data-testid": "earner" }, r.shikona)
      )
    ),
}));

vi.mock("@/components/economy/EconomyInfoNote", () => ({
  EconomyInfoNote: () => React.createElement("div", null, "Info"),
}));

vi.mock("@/engine/utils/Logger", () => ({
  error: vi.fn(),
}));

const STORAGE_KEY = "basho_sort_economy";

let mockRikishi: any[] = [];

function makeRikishi(id: string, overrides: any = {}): any {
  return {
    id,
    shikona: `Rikishi-${id}`,
    division: "makuuchi",
    economics: { careerKenshoWon: 0 },
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world, playerHeyaId: "h1" },
  } as any);
}

function getEarnerNames(): string[] {
  const earners = document.querySelectorAll("[data-testid='earner']");
  return Array.from(earners).map((el) => el.textContent ?? "");
}

describe("EconomyPage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRikishi = [
      makeRikishi("r1", { shikona: "Charlie", economics: { careerKenshoWon: 5 } }),
      makeRikishi("r2", { shikona: "Alpha", economics: { careerKenshoWon: 20 } }),
      makeRikishi("r3", { shikona: "Bravo", economics: { careerKenshoWon: 10 } }),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ year: 2024 });
    render(<EconomyPage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by name ascending reorders alphabetically", () => {
    mockUseGame({ year: 2024 });
    render(<EconomyPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Name");
    fireEvent.click(elements[elements.length - 1]);
    const order = getEarnerNames();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by kensho ascending", () => {
    mockUseGame({ year: 2024 });
    render(<EconomyPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Kensho");
    fireEvent.click(elements[elements.length - 1]);
    const order = getEarnerNames();
    // asc: 5, 10, 20 → Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ year: 2024 });
    render(<EconomyPage />);
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
    render(<EconomyPage />);
    const order = getEarnerNames();
    // desc name: Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});

// ── V16-B18 — bailout gate must match LOAN_ISSUANCE_THRESHOLD ────────────────
describe("V16-B18 bailout gate", () => {
  beforeEach(() => {
    mockRikishi = [];
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderWithFunds(funds: number) {
    cleanup();
    mockGetPlayerHeya.mockReturnValue({
      id: "h1",
      name: "TestHeya",
      funds,
      runwayBand: "stable",
      rikishiIds: [],
      oyakataId: "o1",
    });
    mockUseGame({ year: 2024 });
    render(<EconomyPage />);
    return screen.getByTestId("bailout-card");
  }

  it("enables bailout below LOAN_ISSUANCE_THRESHOLD (-5M) and disables above it", async () => {
    const { LOAN_ISSUANCE_THRESHOLD } = await import("@/constants/engine/economic");
    // The engine no-ops when funds >= LOAN_ISSUANCE_THRESHOLD. The page gate
    // must match exactly so the button is never enabled-but-dead.
    expect(renderWithFunds(LOAN_ISSUANCE_THRESHOLD - 1).dataset.canRequest).toBe("true");
    expect(renderWithFunds(-1_000_000).dataset.canRequest).toBe("false");
    expect(renderWithFunds(0).dataset.canRequest).toBe("false");
  });
});
