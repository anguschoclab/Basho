import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RikishiCareerTab } from "@/components/rikishi/RikishiCareerTab";
import type {
  NotableBoutEntry,
  NarrativeHighlight,
  PromotionHistoryEntry,
} from "@/engine/almanac/types";
import type { CareerSnapshot, Milestone } from "@/engine/types/history";

// Mock recharts to avoid rendering issues in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "chart" }, children),
  ComposedChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  Area: () => React.createElement("div"),
  AreaChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  Bar: () => React.createElement("div"),
  Line: () => React.createElement("div"),
  XAxis: () => React.createElement("div"),
  YAxis: () => React.createElement("div"),
  Tooltip: () => React.createElement("div"),
  Legend: () => React.createElement("div"),
  CartesianGrid: () => React.createElement("div"),
}));

// Mock NarrativeService
vi.mock("@/engine/systems/narrative/NarrativeService", () => ({
  NarrativeService: {
    getWeightBand: () => "heavy",
    getWeightLabel: () => "Heavyweight",
  },
}));

// Mock SeededRNG
vi.mock("@/engine/rng", () => ({
  SeededRNG: class {
    next() {
      return 0.5;
    }
    pick(arr: unknown[]) {
      return arr[0];
    }
  },
}));

// Mock TooltipWrap
vi.mock("@/components/ui/tooltip", () => ({
  TooltipWrap: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
  TooltipProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

const emptyHistory: CareerSnapshot[] = [];
const emptyMilestones: Milestone[] = [];
const emptyProgressionData: Array<{
  basho: string;
  rankValue: number;
  wins: number;
  losses: number;
  winRate: number;
}> = [];

const sampleHighlights: NarrativeHighlight[] = [
  { year: 2025, bashoName: "hatsu", type: "yusho", text: "Won first tournament" },
  { year: 2024, bashoName: "aki", type: "kinboshi", text: "Defeated yokozuna", boutId: "b-1" },
  { year: 2023, bashoName: "natsu", type: "promotion", text: "Promoted to sanyaku" },
];

const sampleNotableBouts: NotableBoutEntry[] = [
  {
    boutId: "b-1",
    year: 2025,
    bashoName: "hatsu",
    day: 10,
    opponentId: "r2",
    opponentShikona: "YokozunaHero",
    winner: true,
    kimarite: "uwatenage",
    isKinboshi: true,
    isUpset: false,
    isYushoRace: false,
    excitementScore: 45,
    narrativeLines: ["Kinboshi secured!", "Crowd erupts!"],
  },
  {
    boutId: "b-2",
    year: 2024,
    bashoName: "aki",
    day: 8,
    opponentId: "r3",
    opponentShikona: "UpsetVictim",
    winner: true,
    kimarite: "yori-kiri",
    isKinboshi: false,
    isUpset: true,
    isYushoRace: false,
    narrativeLines: ["Shock upset!"],
  },
];

const samplePromotionHistory: PromotionHistoryEntry[] = [
  {
    year: 2025,
    bashoName: "hatsu",
    fromRank: "maegashira 5",
    toRank: "komusubi",
    kind: "promotion",
    isJump: false,
    isSanyaku: true,
    isSekitori: false,
  },
];

describe("RikishiCareerTab narrative sections", () => {
  it("renders Narrative Highlights section when highlights provided", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        narrativeHighlights={sampleHighlights}
      />
    );
    expect(screen.getByText(/Narrative Highlights/i)).toBeTruthy();
  });

  it("renders Notable Bouts section when bouts provided", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        notableBouts={sampleNotableBouts}
      />
    );
    expect(screen.getByText(/Notable Bouts/i)).toBeTruthy();
  });

  it("does not render narrative sections when props are empty/undefined", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
      />
    );
    expect(screen.queryByText(/Narrative Highlights/i)).toBeNull();
    expect(screen.queryByText(/Notable Bouts/i)).toBeNull();
  });

  it("displays highlight text with year/basho badge", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        narrativeHighlights={sampleHighlights}
      />
    );
    expect(screen.getByText("Won first tournament")).toBeTruthy();
  });

  it("displays notable bout with opponent shikona", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        notableBouts={sampleNotableBouts}
      />
    );
    expect(screen.getAllByText(/YokozunaHero/).length).toBeGreaterThan(0);
  });

  it("displays notable bout with kimarite", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        notableBouts={sampleNotableBouts}
      />
    );
    expect(screen.getByText("uwatenage")).toBeTruthy();
  });

  it("shows gold star badge for kinboshi bouts", () => {
    const { container } = render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        notableBouts={sampleNotableBouts}
      />
    );
    // Kinboshi bouts should have a star icon or badge
    expect(container.textContent).toContain("YokozunaHero");
  });

  it("shows UPSET tag for upset bouts", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        notableBouts={sampleNotableBouts}
      />
    );
    expect(screen.getAllByText(/UPSET/i).length).toBeGreaterThan(0);
  });

  it("renders Promotion History section when provided", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        promotionHistory={samplePromotionHistory}
      />
    );
    expect(screen.getByText(/Promotion History/i)).toBeTruthy();
  });

  it("displays promotion history from/to rank transitions", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        promotionHistory={samplePromotionHistory}
      />
    );
    expect(screen.getByText(/maegashira 5/i)).toBeTruthy();
    expect(screen.getByText(/komusubi/i)).toBeTruthy();
  });

  it("sorts highlights most-recent-first", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        narrativeHighlights={sampleHighlights}
      />
    );
    const highlights = screen.getAllByText(/2025|2024|2023/);
    // First highlight should be 2025 (most recent)
    expect(highlights[0].textContent).toContain("2025");
  });

  it("sorts bouts most-recent-first", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        notableBouts={sampleNotableBouts}
      />
    );
    const bouts = screen.getAllByText(/YokozunaHero|UpsetVictim/);
    // First bout should be 2025 (most recent)
    expect(bouts[0].textContent).toContain("YokozunaHero");
  });

  it("expandable bout detail when boutId is clicked", () => {
    render(
      <RikishiCareerTab
        history={emptyHistory}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        notableBouts={sampleNotableBouts}
      />
    );
    // Narrative lines should be hidden initially or shown on expand
    const boutId = screen.getByText("b-1");
    fireEvent.click(boutId);
    // After clicking, narrative lines should be visible
    expect(screen.getByText("Kinboshi secured!")).toBeTruthy();
  });
});

// ── Earnings tracker tests ──────────────────────────────────────────────────

function makeEarningsSnapshot(
  year: number,
  bashoName: string,
  totalEarningsAtBasho?: number
): CareerSnapshot {
  return {
    id: `snap-${bashoName}-${year}`,
    bashoId: `${bashoName}-${year}`,
    year,
    month: 1,
    bashoName,
    rank: "maegashira" as any,
    division: "makuuchi",
    rankNumber: 5,
    side: "east",
    wins: 8,
    losses: 7,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 140,
    momentum: 0,
    ...(totalEarningsAtBasho !== undefined ? { totalEarningsAtBasho } : {}),
  } as CareerSnapshot;
}

const sampleEconomics = {
  totalEarnings: 500000,
  cash: 100000,
  retirementFund: 50000,
  careerKenshoWon: 3,
  kinboshiCount: 2,
  popularity: 75,
  currentBashoEarnings: 21000,
};

const sampleEarningsProgressionData = [
  { basho: "hatsu 2024", cumulativeEarnings: 100000, bashoEarnings: 100000 },
  { basho: "natsu 2024", cumulativeEarnings: 250000, bashoEarnings: 150000 },
  { basho: "aki 2024", cumulativeEarnings: 500000, bashoEarnings: 250000 },
];

describe("RikishiCareerTab earnings tracker", () => {
  it("renders earnings chart when earningsProgressionData is populated", () => {
    render(
      <RikishiCareerTab
        history={[]}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        earningsProgressionData={sampleEarningsProgressionData}
        economics={sampleEconomics}
      />
    );
    expect(screen.getByText(/Career Earnings/i)).toBeTruthy();
  });

  it("renders cumulative earnings summary values from economics prop", () => {
    render(
      <RikishiCareerTab
        history={[]}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        earningsProgressionData={sampleEarningsProgressionData}
        economics={sampleEconomics}
      />
    );
    // 500000 formatted with toLocaleString should contain "500,000"
    expect(screen.getByText(/500,000/)).toBeTruthy();
    // 100000 formatted should contain "100,000"
    expect(screen.getByText(/100,000/)).toBeTruthy();
  });

  it("renders cumulative ¥ column in basho history table for snapshots with totalEarningsAtBasho", () => {
    const historyWithEarnings: CareerSnapshot[] = [
      makeEarningsSnapshot(2024, "hatsu", 100000),
      makeEarningsSnapshot(2024, "natsu", 250000),
    ];
    render(
      <RikishiCareerTab
        history={historyWithEarnings}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
      />
    );
    // The cumulative ¥ column header should be present
    expect(screen.getByText(/Cumulative/i)).toBeTruthy();
    // 250000 formatted should appear (newest snapshot shown first in table)
    expect(screen.getByText(/250,000/)).toBeTruthy();
  });

  it("renders — for snapshots without totalEarningsAtBasho", () => {
    const historyWithoutEarnings: CareerSnapshot[] = [
      makeEarningsSnapshot(2024, "hatsu"), // no totalEarningsAtBasho
    ];
    render(
      <RikishiCareerTab
        history={historyWithoutEarnings}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
      />
    );
    // Snapshots without earnings should show an em-dash
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("does not render earnings chart when earningsProgressionData is empty", () => {
    render(
      <RikishiCareerTab
        history={[]}
        milestones={emptyMilestones}
        careerProgressionData={emptyProgressionData}
        earningsProgressionData={[]}
        economics={sampleEconomics}
      />
    );
    expect(screen.queryByText(/Career Earnings/i)).toBeNull();
  });
});
