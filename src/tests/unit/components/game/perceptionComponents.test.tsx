import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import {
  RikishiSelectorList,
  StableMetricGrid,
  RikishiComparisonGrid,
  MatchupRow,
  PerceptionChip,
  StablePerceptionCard,
  H2HPanel,
} from "@/components/game/perceptionComponents";
import { Users } from "lucide-react";
import type { PerceptionSnapshot } from "@/engine/perception";
import { projectH2HBetweenHeyas } from "@/presenters/uiDigest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockUseGame = vi.fn();
vi.mock("@/contexts/useGame", () => ({
  useGame: () => mockUseGame(),
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectH2HBetweenHeyas: vi.fn(),
}));

function makePerception(overrides: Record<string, unknown> = {}) {
  return {
    rikishiId: "r1",
    shikona: "Aoiyama",
    rank: "maegashira",
    style: "oshi",
    healthBand: "good",
    mediaHeatBand: "warm",
    momentum: "rising",
    ageBand: "prime",
    experienceBand: "veteran",
    weightBand: "solid",
    heightBand: "tall",
    ...overrides,
  } as PerceptionSnapshot["rikishiPerceptions"][number];
}

function makeSnapshot(overrides: Partial<PerceptionSnapshot> = {}): PerceptionSnapshot {
  return {
    heyaId: "h1",
    heyaName: "Isegahama",
    generatedAtWeek: 5,
    generatedAtYear: 2026,
    statureBand: "powerhouse",
    prestigeBand: "elite",
    runwayBand: "flush",
    koenkaiBand: "vibrant",
    welfareRiskBand: "safe",
    complianceState: "compliant",
    governancePressureBand: "none",
    stableMediaHeatBand: "warm",
    rivalryPressureBand: "simmering",
    rosterStrengthBand: "strong",
    rosterSize: 12,
    moraleBand: "content",
    rikishiPerceptions: [makePerception()],
    alignmentScore: 0.8,
    styleBias: "oshi",
    ...overrides,
  } as PerceptionSnapshot;
}

describe("RikishiSelectorList", () => {
  afterEach(cleanup);

  it("renders items and calls onSelect", () => {
    const onSelect = vi.fn();
    render(
      <RikishiSelectorList
        perceptions={[makePerception(), makePerception({ rikishiId: "r2", shikona: "Hoshoryu" })]}
        selectedId="r1"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText("Hoshoryu"));
    expect(onSelect).toHaveBeenCalledWith("r2");
  });
});

describe("StableMetricGrid", () => {
  afterEach(cleanup);

  it("renders both stables' banded metrics", () => {
    const a = makeSnapshot({ heyaName: "Alpha Stable" });
    const b = makeSnapshot({ heyaName: "Beta Stable", moraleBand: "inspired" });
    render(<StableMetricGrid snapA={a} snapB={b} />);
    expect(screen.getByText("Alpha Stable")).toBeTruthy();
    expect(screen.getByText("Beta Stable")).toBeTruthy();
    expect(screen.getByText("Stature")).toBeTruthy();
    expect(screen.getByText("Compliance")).toBeTruthy();
  });
});

describe("RikishiComparisonGrid", () => {
  afterEach(cleanup);

  it("renders per-rikishi comparison rows", () => {
    const a = makeSnapshot({ heyaName: "Alpha" });
    const b = makeSnapshot({
      heyaName: "Beta",
      rikishiPerceptions: [makePerception({ rikishiId: "r9", shikona: "Kirishima" })],
    });
    render(<RikishiComparisonGrid snapA={a} snapB={b} />);
    // Name appears both in the selector list and the comparison header.
    expect(screen.getAllByText("Aoiyama").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kirishima").length).toBeGreaterThan(0);
    expect(screen.getByText("Momentum")).toBeTruthy();
  });

  it("shows the select prompt when a side has no rikishi", () => {
    const a = makeSnapshot({ rikishiPerceptions: [] });
    const b = makeSnapshot();
    render(<RikishiComparisonGrid snapA={a} snapB={b} />);
    expect(screen.getByText(/Select one rikishi from each stable/)).toBeTruthy();
  });
});

describe("MatchupRow", () => {
  afterEach(cleanup);

  it("renders the pairwise record with kimarite badge", () => {
    render(
      <MatchupRow
        m={{
          rikishiAId: "r1",
          rikishiAName: "Aoiyama",
          rikishiBId: "r2",
          rikishiBName: "Hoshoryu",
          aWins: 4,
          bWins: 2,
          lastKimarite: "yorikiri",
        }}
      />
    );
    expect(screen.getByText("Aoiyama")).toBeTruthy();
    expect(screen.getByText("yorikiri")).toBeTruthy();
  });
});

describe("PerceptionChip", () => {
  afterEach(cleanup);

  it("renders label, value, and optional count", () => {
    render(<PerceptionChip icon={Users} label="Roster" value="strong" count={12} />);
    expect(screen.getByText("Roster:")).toBeTruthy();
    expect(screen.getByText(/strong/)).toBeTruthy();
    expect(screen.getByText("(12)")).toBeTruthy();
  });
});

describe("StablePerceptionCard", () => {
  afterEach(cleanup);

  it("navigates on click when not comparing", () => {
    const onNavigate = vi.fn();
    const onToggleCompare = vi.fn();
    render(
      <StablePerceptionCard
        snap={makeSnapshot()}
        comparing={false}
        isSelected={false}
        onToggleCompare={onToggleCompare}
        onNavigate={onNavigate}
      />
    );
    fireEvent.click(screen.getByText("Isegahama"));
    expect(onNavigate).toHaveBeenCalledWith("h1");
    expect(onToggleCompare).not.toHaveBeenCalled();
  });

  it("toggles compare on click when comparing", () => {
    const onNavigate = vi.fn();
    const onToggleCompare = vi.fn();
    render(
      <StablePerceptionCard
        snap={makeSnapshot()}
        comparing
        isSelected
        onToggleCompare={onToggleCompare}
        onNavigate={onNavigate}
      />
    );
    fireEvent.click(screen.getByText("Isegahama"));
    expect(onToggleCompare).toHaveBeenCalledWith("h1");
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByText("Selected")).toBeTruthy();
  });

  it("shows warning badge for non-compliant stables", () => {
    render(
      <StablePerceptionCard
        snap={{ ...makeSnapshot({ complianceState: "watch" }), isPlayer: true }}
        comparing={false}
        isSelected={false}
        onToggleCompare={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByText("Your Stable")).toBeTruthy();
    expect(screen.getByText(/watch/)).toBeTruthy();
  });
});

describe("H2HPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders no-data fallback when projection is null", () => {
    mockUseGame.mockReturnValue({ state: { world: {} } });
    vi.mocked(projectH2HBetweenHeyas).mockReturnValue(null);
    render(<H2HPanel heyaAId="h1" heyaBId="h2" />);
    expect(screen.getByText("No data available.")).toBeTruthy();
  });

  it("renders empty state when no bouts recorded", () => {
    mockUseGame.mockReturnValue({ state: { world: {} } });
    vi.mocked(projectH2HBetweenHeyas).mockReturnValue({
      heyaAName: "A",
      heyaBName: "B",
      winsA: 0,
      winsB: 0,
      totalBouts: 0,
      matchups: [],
    });
    render(<H2HPanel heyaAId="h1" heyaBId="h2" />);
    expect(screen.getByText(/No bouts recorded/)).toBeTruthy();
  });

  it("renders aggregate record and matchup rows", () => {
    mockUseGame.mockReturnValue({ state: { world: {} } });
    vi.mocked(projectH2HBetweenHeyas).mockReturnValue({
      heyaAName: "A",
      heyaBName: "B",
      winsA: 5,
      winsB: 3,
      totalBouts: 8,
      matchups: [
        {
          rikishiAId: "r1",
          rikishiAName: "Aoiyama",
          rikishiBId: "r2",
          rikishiBName: "Hoshoryu",
          aWins: 5,
          bWins: 3,
          lastKimarite: "yorikiri",
        },
      ],
    });
    render(<H2HPanel heyaAId="h1" heyaBId="h2" />);
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getByText(/8 bouts across 1 matchup/)).toBeTruthy();
    expect(screen.getByText("Aoiyama")).toBeTruthy();
  });
});
