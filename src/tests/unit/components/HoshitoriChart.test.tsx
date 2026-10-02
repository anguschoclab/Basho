import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { HoshitoriChart } from "@/components/game/HoshitoriChart";
import type { MatchSchedule } from "@/engine/types/basho";

function makeMatch(day: number, east: string, west: string, result?: Partial<MatchSchedule["result"]>): MatchSchedule {
  return {
    boutId: `d${day}-${east}-${west}`,
    day,
    eastRikishiId: east,
    westRikishiId: west,
    result: result
      ? ({
          winnerRikishiId: "r1",
          loserRikishiId: "opp",
          winner: "east",
          kimarite: "yorikiri",
          isKinboshi: false,
          log: [],
          kenshoEnvelopes: 0,
          momentumScore: 0,
          inBoutInjury: null,
          isTimeout: false,
          upset: false,
          ...result,
        } as never)
      : undefined,
  };
}

describe("HoshitoriChart", () => {
  it("renders 15 day cells", () => {
    const matches: MatchSchedule[] = [];
    render(<HoshitoriChart rikishiId="r1" matches={matches} />);
    expect(screen.getAllByTestId(/hoshitori-day-\d+/)).toHaveLength(15);
  });

  it("marks a win as shiroboshi (white star) and a loss as kuroboshi", () => {
    const matches = [
      makeMatch(1, "r1", "opp", { winnerRikishiId: "r1", loserRikishiId: "opp" }),
      makeMatch(2, "r1", "opp", { winnerRikishiId: "opp", loserRikishiId: "r1" }),
    ];
    render(<HoshitoriChart rikishiId="r1" matches={matches} />);
    expect(screen.getByTestId("hoshitori-day-1").getAttribute("data-outcome")).toBe("win");
    expect(screen.getByTestId("hoshitori-day-2").getAttribute("data-outcome")).toBe("loss");
  });

  it("marks a maegashira-over-yokozuna win as a gold kinboshi cell", () => {
    const matches = [
      makeMatch(5, "r1", "yoko", {
        winnerRikishiId: "r1",
        loserRikishiId: "yoko",
        isKinboshi: true,
        awards: [
          { type: "kinboshi", winnerId: "r1", loserId: "yoko", day: 5, boutId: "d5-r1-yoko" },
        ],
      }),
    ];
    render(<HoshitoriChart rikishiId="r1" matches={matches} />);
    const cell = screen.getByTestId("hoshitori-day-5");
    expect(cell.getAttribute("data-outcome")).toBe("kinboshi");
  });

  it("renders absent/kyujo days distinctly from losses", () => {
    const matches = [
      makeMatch(3, "r1", "opp", {
        winnerRikishiId: "opp",
        loserRikishiId: "r1",
        kimarite: "fusensho",
      }),
    ];
    render(<HoshitoriChart rikishiId="r1" matches={matches} />);
    expect(screen.getByTestId("hoshitori-day-3").getAttribute("data-outcome")).toBe("absence");
  });

  it("leaves unplayed days empty rather than fabricating results", () => {
    render(<HoshitoriChart rikishiId="r1" matches={[makeMatch(1, "r1", "opp")]} />);
    expect(screen.getByTestId("hoshitori-day-15").getAttribute("data-outcome")).toBe("pending");
  });
});
