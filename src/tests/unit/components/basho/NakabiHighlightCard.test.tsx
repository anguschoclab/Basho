import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { NakabiHighlightCard } from "@/components/basho/NakabiHighlightCard";
import type { NakabiProjection } from "@/presenters/nakabiProjections";

function makeProjection(overrides: Partial<NakabiProjection> = {}): NakabiProjection {
  return { summary: null, isNakabiDay: false, ...overrides };
}

describe("NakabiHighlightCard", () => {
  afterEach(() => cleanup());

  it("renders nothing when no summary and not nakabi day", () => {
    const { container } = render(<NakabiHighlightCard projection={makeProjection()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders placeholder when nakabi day but no summary yet", () => {
    render(<NakabiHighlightCard projection={makeProjection({ isNakabiDay: true })} />);
    expect(screen.getByTestId("nakabi-card")).toBeDefined();
    expect(screen.getByText("Checkpoint summary not yet available.")).toBeDefined();
  });

  it("renders summary with leader and undefeated count", () => {
    const proj = makeProjection({
      isNakabiDay: true,
      summary: {
        bashoName: "Aki",
        year: 2024,
        day: 8,
        leaderId: "r-1",
        leaderWins: 8,
        leaderLosses: 0,
        undefeatedCount: 3,
        notablePerformers: [],
      },
    });
    render(<NakabiHighlightCard projection={proj} />);
    expect(screen.getByTestId("nakabi-card")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("8-0")).toBeDefined();
  });

  it("renders notable performers", () => {
    const proj = makeProjection({
      isNakabiDay: true,
      summary: {
        bashoName: "Aki",
        year: 2024,
        day: 8,
        leaderId: "r-1",
        leaderWins: 8,
        leaderLosses: 0,
        undefeatedCount: 1,
        notablePerformers: [
          { rikishiId: "r-2", shikona: "Young Hopeful", wins: 7, losses: 1, note: "Upset specialist" },
        ],
      },
    });
    render(<NakabiHighlightCard projection={proj} />);
    expect(screen.getByTestId("nakabi-performer-r-2")).toBeDefined();
    expect(screen.getByText("Young Hopeful")).toBeDefined();
  });
});
