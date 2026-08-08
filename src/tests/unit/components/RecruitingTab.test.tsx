import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import { RecruitingTab } from "@/components/scouting/RecruitingTab";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/contexts/useGame");

vi.mock("@/store/gameStore", () => ({
  useGameStore: () => ({ sendCommand: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectRecruitmentUIDigest: () => ({ candidates: mockCandidates }),
  resolveRegistryLabel: (_registry: string, value: string) => value,
}));

vi.mock("@/engine/utils/citizenshipUtils", () => ({
  getHeyaForeignUsage: () => 0,
}));

vi.mock("@/engine/queries", () => ({
  getHeyaRoster: () => [],
}));

vi.mock("@/engine/archetype", () => ({
  getCombatArchetypeDescription: () => "Test archetype",
}));

vi.mock("@/engine/descriptorBands", () => ({
  toPotentialBand: (seed: number) => (seed >= 80 ? "elite" : seed >= 60 ? "high" : "moderate"),
}));

vi.mock("@/constants/ui/labels", () => ({
  POTENTIAL_LABELS: { elite: "Elite", high: "High", moderate: "Moderate" },
}));

vi.mock("@/components/game/RecruitSigningDialog", () => ({
  RecruitSigningDialog: () => null,
}));

vi.mock("@/components/scouting/CompareModePanel", () => ({
  CompareModePanel: () => null,
}));

vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children }: any) => React.createElement("span", null, children),
}));

const STORAGE_KEY = "basho_sort_recruiting";

let mockCandidates: any[] = [];

function makeCandidate(id: string, overrides: any = {}): any {
  return {
    candidateId: id,
    name: `Candidate-${id}`,
    birthYear: 2000,
    nationality: "Japan",
    archetype: "power",
    style: "oshi",
    talentSeed: 50,
    visibilityBand: "public",
    availabilityState: "available",
    competingSuitors: [],
    scoutLevel: 50,
    scoutInfo: { label: "Fair", color: "text-muted-foreground", narrative: "" },
    poolType: "high_school",
    age: 18,
    ageDescriptor: "Young",
    height: 175,
    heightDescriptor: "Average",
    weight: 120,
    weightDescriptor: "Medium",
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

function getCardOrder(): string[] {
  const cards = document.querySelectorAll(".paper.cursor-pointer");
  return Array.from(cards).map(
    (el) => el.querySelector(".font-display")?.textContent ?? ""
  );
}

describe("RecruitingTab sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockCandidates = [
      makeCandidate("c1", {
        name: "Alpha",
        age: 16,
        talentSeed: 40,
        scoutLevel: 30,
        archetype: "power",
      }),
      makeCandidate("c2", {
        name: "Bravo",
        age: 20,
        talentSeed: 85,
        scoutLevel: 80,
        archetype: "technician",
      }),
      makeCandidate("c3", {
        name: "Charlie",
        age: 18,
        talentSeed: 60,
        scoutLevel: 50,
        archetype: "balanced",
      }),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024, heyas: new Map([["h1", { id: "h1", name: "TestHeya", rikishiIds: [] }]]) });
    render(<TooltipProvider><RecruitingTab playerHeyaId="h1" /></TooltipProvider>);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by name ascending reorders alphabetically", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024, heyas: new Map([["h1", { id: "h1", name: "TestHeya", rikishiIds: [] }]]) });
    render(<TooltipProvider><RecruitingTab playerHeyaId="h1" /></TooltipProvider>);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    // "Name" appears both as trigger value and dropdown option; pick the option (last match)
    const nameElements = screen.getAllByText("Name");
    fireEvent.click(nameElements[nameElements.length - 1]);
    const order = getCardOrder();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by age ascending", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024, heyas: new Map([["h1", { id: "h1", name: "TestHeya", rikishiIds: [] }]]) });
    render(<TooltipProvider><RecruitingTab playerHeyaId="h1" /></TooltipProvider>);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Age");
    fireEvent.click(elements[elements.length - 1]);
    const order = getCardOrder();
    // asc: 16, 18, 20 → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorting by potential ascending", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024, heyas: new Map([["h1", { id: "h1", name: "TestHeya", rikishiIds: [] }]]) });
    render(<TooltipProvider><RecruitingTab playerHeyaId="h1" /></TooltipProvider>);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Potential");
    fireEvent.click(elements[elements.length - 1]);
    const order = getCardOrder();
    // asc: 40, 60, 85 → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorting by scout level ascending", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024, heyas: new Map([["h1", { id: "h1", name: "TestHeya", rikishiIds: [] }]]) });
    render(<TooltipProvider><RecruitingTab playerHeyaId="h1" /></TooltipProvider>);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Scout Level");
    fireEvent.click(elements[elements.length - 1]);
    const order = getCardOrder();
    // asc: 30, 50, 80 → Alpha, Charlie, Bravo
    expect(order).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ playerHeyaId: "h1", year: 2024, heyas: new Map([["h1", { id: "h1", name: "TestHeya", rikishiIds: [] }]]) });
    render(<TooltipProvider><RecruitingTab playerHeyaId="h1" /></TooltipProvider>);
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
    mockUseGame({ playerHeyaId: "h1", year: 2024, heyas: new Map([["h1", { id: "h1", name: "TestHeya", rikishiIds: [] }]]) });
    render(<TooltipProvider><RecruitingTab playerHeyaId="h1" /></TooltipProvider>);
    const order = getCardOrder();
    // desc age: 20, 18, 16 → Bravo, Charlie, Alpha
    expect(order).toEqual(["Bravo", "Charlie", "Alpha"]);
  });
});
