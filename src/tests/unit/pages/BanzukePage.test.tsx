import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import BanzukePage from "@/pages/BanzukePage";

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

vi.mock("@/components/charts/BanzukePyramid", () => ({
  BanzukePyramid: () => React.createElement("div", null, "Pyramid"),
}));

vi.mock("@/components/banzuke/RikishiCell", () => ({
  RikishiCell: ({ entry }: any) =>
    React.createElement("td", null, entry?.shikona ?? "—"),
}));

vi.mock("@/components/banzuke/YokozunaTrajectory", () => ({
  YokozunaTrajectory: () => React.createElement("div", null, "Trajectory"),
}));

vi.mock("@/components/game/PressConference", () => ({
  PressConference: () => React.createElement("div", null, "Press"),
}));

vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectBanzukeUIDigest: () => ({
    divisionMap: new Map([
      ["makuuchi", {
        rows: mockRows,
      }],
    ]),
    divisionCounts: { makuuchi: mockRows.length * 2 },
    kadobanMap: {},
    heyaNameMap: new Map(),
    hasPrevBasho: false,
    totalWrestlerCount: mockRows.length * 2,
  }),
  projectPressConferenceData: () => null,
}));

vi.mock("@/presenters/projections/promotionProjections", () => ({
  getYokozunaCandidates: () => [],
}));

vi.mock("@/engine/queries", () => ({
  getPlayerHeya: () => ({ id: "h1", name: "TestHeya" }),
  updateHeyaInWorld: (w: any) => w,
}));

const STORAGE_KEY = "basho_sort_banzuke";

let mockRows: any[] = [];

function makeRow(rankKey: string, eastName: string, westName: string, overrides: any = {}): any {
  return {
    rankKey,
    rankLabel: `Rank ${rankKey}`,
    rankTitleJa: "段",
    rankTierClass: "",
    isSanyaku: false,
    east: { id: `e_${rankKey}`, shikona: eastName, rank: "maegashira", rankNumber: 1 },
    west: { id: `w_${rankKey}`, shikona: westName, rank: "maegashira", rankNumber: 1 },
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
    updateWorld: vi.fn(),
  } as any);
}

function getRikishiNames(): string[] {
  const cells = document.querySelectorAll("td");
  return Array.from(cells)
    .map((el) => el.textContent ?? "")
    .filter((t) => t !== "—" && t.length > 0 && !t.startsWith("Rank "));
}

describe("BanzukePage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRows = [
      makeRow("r1", "Charlie", "Delta"),
      makeRow("r2", "Alpha", "Beta"),
      makeRow("r3", "Echo", "Foxtrot"),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ year: 2024, cyclePhase: "pre_basho" });
    render(<BanzukePage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("preserves official rank order when sort key is default (rank)", () => {
    mockUseGame({ year: 2024, cyclePhase: "pre_basho" });
    render(<BanzukePage />);
    const order = getRikishiNames();
    // Default sort key is "rank" — rows should stay in original order: r1, r2, r3
    expect(order).toEqual(["Charlie", "Delta", "Alpha", "Beta", "Echo", "Foxtrot"]);
  });

  it("within-division reordering works when sort key is changed to shikona", () => {
    mockUseGame({ year: 2024, cyclePhase: "pre_basho" });
    render(<BanzukePage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Shikona");
    fireEvent.click(elements[elements.length - 1]);
    const order = getRikishiNames();
    // Should contain Alpha, Beta, Charlie, Delta, Echo, Foxtrot in asc order
    expect(order).toEqual(["Alpha", "Beta", "Charlie", "Delta", "Echo", "Foxtrot"]);
  });

  it("reverts to official rank order when sort key is changed back to rank", () => {
    mockUseGame({ year: 2024, cyclePhase: "pre_basho" });
    render(<BanzukePage />);
    // First sort by shikona
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getAllByText("Shikona").pop()!);
    let order = getRikishiNames();
    expect(order).toEqual(["Alpha", "Beta", "Charlie", "Delta", "Echo", "Foxtrot"]);
    // Now switch back to rank
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getAllByText("Rank").pop()!);
    order = getRikishiNames();
    // Back to official order: r1, r2, r3
    expect(order).toEqual(["Charlie", "Delta", "Alpha", "Beta", "Echo", "Foxtrot"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ year: 2024, cyclePhase: "pre_basho" });
    render(<BanzukePage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Shikona");
    fireEvent.click(elements[elements.length - 1]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("shikona");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "shikona", order: "desc" }));
    mockUseGame({ year: 2024, cyclePhase: "pre_basho" });
    render(<BanzukePage />);
    const order = getRikishiNames();
    // desc by east shikona: Echo, Charlie, Alpha → rows: (Echo,Foxtrot), (Charlie,Delta), (Alpha,Beta)
    expect(order).toEqual(["Echo", "Foxtrot", "Charlie", "Delta", "Alpha", "Beta"]);
  });
});
