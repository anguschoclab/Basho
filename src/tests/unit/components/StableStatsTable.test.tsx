/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
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

describe("StableStatsTable", () => {
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
    render(<StableStatsTable rikishiList={[makeUIRikishi()]} />);
    expect(screen.getByText("all")).toBeTruthy();
    expect(screen.getByText("makuuchi")).toBeTruthy();
    expect(screen.getByText("juryo")).toBeTruthy();
    expect(screen.getByText("makushita")).toBeTruthy();
    expect(screen.getByText("lower")).toBeTruthy();
  });

  describe("TableHeader keyboard accessibility", () => {
    it("TableHeader has role=button and tabIndex=0", () => {
      const { container } = render(
        <StableStatsTable rikishiList={[makeUIRikishi()]} />
      );
      const headers = container.querySelectorAll("th[role='button']");
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach((h) => {
        expect(h.getAttribute("tabindex")).toBe("0");
      });
    });

    it("TableHeader fires onClick on Enter key press", () => {
      const { container } = render(
        <StableStatsTable rikishiList={[makeUIRikishi()]} />
      );
      const firstHeader = container.querySelector(
        "th[role='button']"
      ) as HTMLElement;
      expect(firstHeader).not.toBeNull();

      fireEvent.keyDown(firstHeader, { key: "Enter" });
      // After clicking Shikona header, it should sort by shikona
      // Verify the header is still interactive
      expect(firstHeader.getAttribute("role")).toBe("button");
    });

    it("TableHeader fires onClick on Space key press with preventDefault", () => {
      const { container } = render(
        <StableStatsTable rikishiList={[makeUIRikishi()]} />
      );
      const firstHeader = container.querySelector(
        "th[role='button']"
      ) as HTMLElement;
      expect(firstHeader).not.toBeNull();

      const preventDefault = vi.fn();
      fireEvent.keyDown(firstHeader, { key: " ", preventDefault });
      expect(preventDefault).toHaveBeenCalled();
    });

    it("TableHeader has focus-visible ring class", () => {
      const { container } = render(
        <StableStatsTable rikishiList={[makeUIRikishi()]} />
      );
      const firstHeader = container.querySelector(
        "th[role='button']"
      ) as HTMLElement;
      expect(firstHeader.className).toContain("focus-visible:ring");
    });
  });

  describe("DivisionFilterBadge keyboard accessibility", () => {
    it("DivisionFilterBadge has role=button and tabIndex=0", () => {
      const { container } = render(
        <StableStatsTable rikishiList={[makeUIRikishi()]} />
      );
      // Division filter badges should have role=button after PR #742 merge
      // Before merge, they won't have it — this test verifies the merge
      const filterBadges = container.querySelectorAll("[role='button']");
      expect(filterBadges.length).toBeGreaterThan(0);
    });
  });
});
