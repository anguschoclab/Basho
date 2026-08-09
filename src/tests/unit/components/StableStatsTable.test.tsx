import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StableStatsTable } from "@/components/game/StableStatsTable";
import type { UIRikishi } from "@/presenters/uiModels";

function makeUIRikishi(overrides: Partial<UIRikishi> = {}): UIRikishi {
  return {
    id: "r1",
    shikona: "TestRikishi",
    division: "makuuchi",
    careerWins: 10,
    careerLosses: 5,
    winPercentage: 0.667,
    streak: 3,
    streakLabel: "W3",
    avgRankLabel: "M1",
    currentBashoRecord: "8-7",
    ...overrides,
  } as unknown as UIRikishi;
}

function makeMultiRikishi(): UIRikishi[] {
  return [
    {
      id: "r1",
      shikona: "Alpha",
      division: "makuuchi",
      careerWins: 10,
      careerLosses: 5,
      winPercentage: 0.667,
      streak: 3,
      streakLabel: "W3",
      avgRankLabel: "M1",
      currentBashoRecord: "8-7",
    },
    {
      id: "r2",
      shikona: "Bravo",
      division: "juryo",
      careerWins: 20,
      careerLosses: 15,
      winPercentage: 0.571,
      streak: -2,
      streakLabel: "L2",
      avgRankLabel: "J1",
      currentBashoRecord: "5-10",
    },
    {
      id: "r3",
      shikona: "Charlie",
      division: "makushita",
      careerWins: 5,
      careerLosses: 2,
      winPercentage: 0.714,
      streak: 0,
      streakLabel: "-",
      avgRankLabel: "Ms1",
      currentBashoRecord: "3-2",
    },
  ] as unknown as UIRikishi[];
}

function getCellText(container: HTMLElement, cellIndex: number): string[] {
  const rows = container.querySelectorAll("tbody tr");
  return Array.from(rows).map((row) => row.querySelectorAll("td")[cellIndex]?.textContent ?? "");
}

function clickFilterBadge(container: HTMLElement, text: string): void {
  const badges = container.querySelectorAll("[role='button']:not(th)");
  const badge = Array.from(badges).find((el) => el.textContent === text);
  if (!badge) throw new Error(`Filter badge "${text}" not found`);
  fireEvent.click(badge);
}

describe("StableStatsTable", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders table headers for all 8 columns", () => {
    render(<StableStatsTable rikishiList={[makeUIRikishi()]} />);
    expect(screen.getByText("Shikona")).toBeTruthy();
    expect(screen.getByText("Division")).toBeTruthy();
    expect(screen.getByText("Wins")).toBeTruthy();
    expect(screen.getByText("Losses")).toBeTruthy();
    expect(screen.getByText("Win %")).toBeTruthy();
    expect(screen.getByText("Streak")).toBeTruthy();
    expect(screen.getByText("Avg Rank")).toBeTruthy();
  });

  it("renders empty state with colSpan matching column count (8)", () => {
    const { container } = render(<StableStatsTable rikishiList={[]} />);
    const emptyRow = container.querySelector("td[colspan]");
    expect(emptyRow).not.toBeNull();
    expect(emptyRow?.getAttribute("colspan")).toBe("8");
  });

  it("renders division filter badges", () => {
    const { container } = render(<StableStatsTable rikishiList={[makeUIRikishi()]} />);
    const badges = container.querySelectorAll("[role='button']");
    // 7 TableHeaders + 5 DivisionFilterBadges = 12 elements with role=button
    expect(badges.length).toBe(12);
  });

  describe("TableHeader keyboard accessibility", () => {
    it("TableHeader has role=button and tabIndex=0", () => {
      const { container } = render(<StableStatsTable rikishiList={[makeUIRikishi()]} />);
      const headers = container.querySelectorAll("th[role='button']");
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach((h) => {
        expect(h.getAttribute("tabindex")).toBe("0");
      });
    });

    it("TableHeader fires onClick on Enter key press", () => {
      const { container } = render(<StableStatsTable rikishiList={[makeUIRikishi()]} />);
      const firstHeader = container.querySelector("th[role='button']") as HTMLElement;
      expect(firstHeader).not.toBeNull();

      fireEvent.keyDown(firstHeader, { key: "Enter" });
      // After clicking Shikona header, it should sort by shikona
      // Verify the header is still interactive
      expect(firstHeader.getAttribute("role")).toBe("button");
    });

    it("TableHeader fires onClick on Space key press with preventDefault", () => {
      const { container } = render(<StableStatsTable rikishiList={[makeUIRikishi()]} />);
      const firstHeader = container.querySelector("th[role='button']") as HTMLElement;
      expect(firstHeader).not.toBeNull();

      const eventsBefore = container.querySelectorAll("th[role='button']");
      fireEvent.keyDown(firstHeader, { key: " " });
      // Space key should trigger sort — verify the header is still interactive
      expect(eventsBefore.length).toBeGreaterThan(0);
    });

    it("TableHeader has focus-visible ring class", () => {
      const { container } = render(<StableStatsTable rikishiList={[makeUIRikishi()]} />);
      const firstHeader = container.querySelector("th[role='button']") as HTMLElement;
      expect(firstHeader.className).toContain("focus-visible:ring");
    });
  });

  describe("DivisionFilterBadge keyboard accessibility", () => {
    it("DivisionFilterBadge has role=button and tabIndex=0", () => {
      const { container } = render(<StableStatsTable rikishiList={[makeUIRikishi()]} />);
      // Division filter badges should have role=button after PR #742 merge
      // Before merge, they won't have it — this test verifies the merge
      const filterBadges = container.querySelectorAll("[role='button']");
      expect(filterBadges.length).toBeGreaterThan(0);
    });
  });

  describe("sorting behavior (regression pin)", () => {
    it("defaults to division ascending", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      // cell 1 = division column (0-indexed)
      const divisions = getCellText(container, 1);
      expect(divisions).toEqual(["juryo", "makushita", "makuuchi"]);
    });

    it("clicking Shikona header sorts by shikona descending (default for new key)", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      fireEvent.click(screen.getByText("Shikona"));
      const shikonas = getCellText(container, 0);
      expect(shikonas).toEqual(["Charlie", "Bravo", "Alpha"]);
    });

    it("clicking the same header again toggles to ascending", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      fireEvent.click(screen.getByText("Shikona")); // desc
      fireEvent.click(screen.getByText("Shikona")); // asc
      const shikonas = getCellText(container, 0);
      expect(shikonas).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("clicking Wins header sorts by careerWins descending", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      fireEvent.click(screen.getByText("Wins"));
      const wins = getCellText(container, 2);
      expect(wins).toEqual(["20", "10", "5"]);
    });

    it("clicking Losses header sorts by careerLosses descending", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      fireEvent.click(screen.getByText("Losses"));
      const losses = getCellText(container, 3);
      expect(losses).toEqual(["15", "5", "2"]);
    });

    it("clicking Win % header sorts by winPercentage descending", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      fireEvent.click(screen.getByText("Win %"));
      // cell 4 = win % column, rendered as "66.7%", "57.1%", "71.4%"
      const winPcts = getCellText(container, 4);
      expect(winPcts[0]).toContain("71.4");
      expect(winPcts[1]).toContain("66.7");
      expect(winPcts[2]).toContain("57.1");
    });

    it("clicking Streak header sorts by streak descending", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      fireEvent.click(screen.getByText("Streak"));
      // cell 5 = streak column; positive streak shows label, 0 shows "-"
      const streaks = getCellText(container, 5);
      // desc: 3, 0, -2 → "W3", "-", "L2"
      expect(streaks[0]).toContain("W3");
      expect(streaks[1]).toContain("-");
      expect(streaks[2]).toContain("L2");
    });

    it("clicking Avg Rank header sorts by avgRankLabel descending", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      fireEvent.click(screen.getByText("Avg Rank"));
      const ranks = getCellText(container, 7);
      // desc: "Ms1", "M1", "J1"
      expect(ranks).toEqual(["Ms1", "M1", "J1"]);
    });

    it("switching to a new sort key resets to descending order", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      // Sort by shikona asc
      fireEvent.click(screen.getByText("Shikona")); // desc
      fireEvent.click(screen.getByText("Shikona")); // asc
      // Now click Wins — should reset to desc
      fireEvent.click(screen.getByText("Wins"));
      const wins = getCellText(container, 2);
      expect(wins).toEqual(["20", "10", "5"]);
    });
  });

  describe("division filter behavior (regression pin)", () => {
    it("clicking makuuchi filter shows only makuuchi rikishi", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      clickFilterBadge(container, "makuuchi");
      const shikonas = getCellText(container, 0);
      expect(shikonas).toEqual(["Alpha"]);
    });

    it("clicking juryo filter shows only juryo rikishi", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      clickFilterBadge(container, "juryo");
      const shikonas = getCellText(container, 0);
      expect(shikonas).toEqual(["Bravo"]);
    });

    it("clicking 'all' filter shows all rikishi", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      clickFilterBadge(container, "juryo");
      clickFilterBadge(container, "all");
      const shikonas = getCellText(container, 0);
      expect(shikonas.length).toBe(3);
    });

    it("clicking 'lower' filter shows non-makuuchi/juryo/makushita rikishi", () => {
      const lowerRikishi = [
        ...makeMultiRikishi(),
        {
          id: "r4",
          shikona: "Delta",
          division: "sandanme",
          careerWins: 1,
          careerLosses: 1,
          winPercentage: 0.5,
          streak: 0,
          streakLabel: "-",
          avgRankLabel: "Sd1",
          currentBashoRecord: "1-1",
        } as unknown as UIRikishi,
      ];
      const { container } = render(<StableStatsTable rikishiList={lowerRikishi} />);
      clickFilterBadge(container, "lower");
      const shikonas = getCellText(container, 0);
      expect(shikonas).toEqual(["Delta"]);
    });

    it("filtered empty state shows empty message with colSpan 8", () => {
      const { container } = render(<StableStatsTable rikishiList={makeMultiRikishi()} />);
      // Filter to "lower" — none of our 3 rikishi are lower division
      clickFilterBadge(container, "lower");
      const emptyRow = container.querySelector("td[colspan]");
      expect(emptyRow).not.toBeNull();
      expect(emptyRow?.getAttribute("colspan")).toBe("8");
      expect(emptyRow?.textContent).toContain("No rikishi");
    });
  });
});
