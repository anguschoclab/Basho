import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import CandidatePoolPage from "@/pages/CandidatePoolPage";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/candidates" }),
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

vi.mock("@/engine/systems/generation/CandidatePoolService", () => ({
  listNPCWatchedCandidates: () => mockCandidates,
  getTopSuitor: (_world: any, candidateId: string) => {
    const c = mockCandidates.find((c) => c.candidateId === candidateId);
    return c?.topSuitor;
  },
}));

vi.mock("@/engine/queries", () => ({
  getPlayerHeya: () => ({ id: "h1", name: "TestHeya", reputation: 50 }),
  getHeya: () => ({ id: "h2", name: "RivalHeya" }),
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

const STORAGE_KEY = "basho_sort_candidate_pool";

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
    isAmateurStar: false,
    isEmergentProdigy: false,
    topSuitor: { heyaId: "h2", interestBand: "high" },
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

function getRowNames(): string[] {
  const rows = document.querySelectorAll(".flex.items-center.gap-3.py-2");
  return Array.from(rows).map((el) => el.querySelector(".font-medium")?.textContent ?? "");
}

describe("CandidatePoolPage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockCandidates = [
      makeCandidate("c1", {
        name: "Alpha",
        birthYear: 2008,
        talentSeed: 40,
        availabilityState: "available",
        topSuitor: { heyaId: "h2", interestBand: "low" },
      }),
      makeCandidate("c2", {
        name: "Bravo",
        birthYear: 2004,
        talentSeed: 85,
        availabilityState: "in_talks",
        topSuitor: { heyaId: "h2", interestBand: "all_in" },
      }),
      makeCandidate("c3", {
        name: "Charlie",
        birthYear: 2006,
        talentSeed: 60,
        availabilityState: "available",
        topSuitor: { heyaId: "h2", interestBand: "medium" },
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
    render(<CandidatePoolPage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by name ascending reorders alphabetically", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<CandidatePoolPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const nameElements = screen.getAllByText("Name");
    fireEvent.click(nameElements[nameElements.length - 1]);
    const order = getRowNames();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by age ascending", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<CandidatePoolPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Age");
    fireEvent.click(elements[elements.length - 1]);
    const order = getRowNames();
    // asc: 16 (2008), 18 (2006), 20 (2004) → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorting by potential ascending", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<CandidatePoolPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Potential");
    fireEvent.click(elements[elements.length - 1]);
    const order = getRowNames();
    // asc: 40, 60, 85 → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024 });
    render(<CandidatePoolPage />);
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
    render(<CandidatePoolPage />);
    const order = getRowNames();
    // desc age: 20, 18, 16 → Bravo, Charlie, Alpha
    expect(order).toEqual(["Bravo", "Charlie", "Alpha"]);
  });
});
