import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import TalentPoolPage from "@/pages/TalentPoolPage";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/talent" }),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

vi.mock("@/store/gameStore", () => ({
  useGameStore: () => ({ sendCommand: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/engine/systems/generation/TalentPoolService", () => ({
  listVisibleCandidates: () => mockCandidates,
  getCandidateScoutingLevel: (_world: any, candidateId: string) => {
    const c = mockCandidates.find((c) => c.candidateId === candidateId);
    return c?.scoutLevel ?? 0;
  },
  getForeignCountInHeya: () => 0,
  FOREIGN_RIKISHI_LIMIT_PER_HEYA: 2,
}));

vi.mock("@/engine/queries", () => ({
  getPlayerHeya: () => ({ id: "h1", name: "TestHeya", reputation: 50, runwayBand: "stable" }),
}));

vi.mock("@/presenters/worldAccess", () => ({
  getHeya: () => ({ id: "h1", name: "TestHeya" }),
  getOyakata: () => ({ archetype: "test" }),
  getTalentPool: () => ({
    pools: {
      high_school: { candidatesVisible: [], candidatesHidden: [] },
      university: { candidatesVisible: [], candidatesHidden: [] },
      foreign: { candidatesVisible: [], candidatesHidden: [] },
    },
  }),
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectEventLogData: () => null,
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: any) => React.createElement("div", null, title),
}));

const STORAGE_KEY = "basho_sort_talent_pool";

let mockCandidates: any[] = [];

function makeCandidate(id: string, overrides: any = {}): any {
  return {
    candidateId: id,
    name: `Candidate-${id}`,
    birthYear: 2006,
    nationality: "Japan",
    archetype: "power",
    style: "oshi",
    talentSeed: 50,
    visibilityBand: "public",
    availabilityState: "available",
    competingSuitors: [],
    tags: [],
    scoutLevel: 50,
    originRegion: "Tokyo",
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

function getCardTitles(): string[] {
  const titles = document.querySelectorAll(".text-base.font-display, h3.text-base");
  return Array.from(titles).map((el) => el.textContent ?? "");
}

describe("TalentPoolPage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockCandidates = [
      makeCandidate("c1", {
        name: "Alpha",
        birthYear: 2008,
        archetype: "power",
        talentSeed: 40,
        scoutLevel: 30,
      }),
      makeCandidate("c2", {
        name: "Bravo",
        birthYear: 2004,
        archetype: "technician",
        talentSeed: 85,
        scoutLevel: 80,
      }),
      makeCandidate("c3", {
        name: "Charlie",
        birthYear: 2006,
        archetype: "balanced",
        talentSeed: 60,
        scoutLevel: 50,
      }),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<TalentPoolPage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by name ascending reorders alphabetically", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<TalentPoolPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const nameElements = screen.getAllByText("Name");
    fireEvent.click(nameElements[nameElements.length - 1]);
    const order = getCardTitles();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by age ascending", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<TalentPoolPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const ageElements = screen.getAllByText("Age");
    fireEvent.click(ageElements[ageElements.length - 1]);
    const order = getCardTitles();
    // asc: 16 (2008), 18 (2006), 20 (2004) → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorting by potential ascending", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<TalentPoolPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Potential");
    fireEvent.click(elements[elements.length - 1]);
    const order = getCardTitles();
    // asc: 40, 60, 85 → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorting by intel ascending", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<TalentPoolPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Intel");
    fireEvent.click(elements[elements.length - 1]);
    const order = getCardTitles();
    // asc: 30, 50, 80 → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<TalentPoolPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Age");
    fireEvent.click(elements[elements.length - 1]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("age");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "age", order: "desc" }));
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<TalentPoolPage />);
    const order = getCardTitles();
    // desc age: 20, 18, 16 → Bravo, Charlie, Alpha
    expect(order).toEqual(["Bravo", "Charlie", "Alpha"]);
  });
});
