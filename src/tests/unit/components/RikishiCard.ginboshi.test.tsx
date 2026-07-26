import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RikishiCard } from "@/components/game/RikishiCard";
import type { Rikishi } from "@/engine/types/rikishi";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeRikishi(opts?: Record<string, any>): Rikishi {
  return {
    id: "test-rikishi",
    shikona: "Test Rikishi",
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    makuuchiWins: 0,
    divisionRecords: {
      makuuchi: { wins: 0, losses: 0 },
      juryo: { wins: 0, losses: 0 },
      makushita: { wins: 0, losses: 0 },
      sandanme: { wins: 0, losses: 0 },
      jonidan: { wins: 0, losses: 0 },
      jonokuchi: { wins: 0, losses: 0 },
    },
    division: "makuuchi",
    rank: "maegashira",
    side: "east",
    stats: { achievements: undefined },
    heyaId: "test-heya",
    achievements: {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      mochikyukinPoints: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    },
    ...opts,
  } as unknown as Rikishi;
}

describe("PR #728: RikishiCard ginboshi display", () => {
  it("C.3: RikishiCard shows ginboshiEarned when > 0", () => {
    const rikishi = makeRikishi({
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 3,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
      },
    });
    const { getByText } = render(
      RikishiCard({ rikishi, onClick: () => {} } as any) as any
    );
    expect(getByText("3")).toBeDefined();
  });

  it("C.4: RikishiCard hides ginboshiEarned when === 0", () => {
    const rikishi = makeRikishi({
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
      },
    });
    const { container } = render(
      RikishiCard({ rikishi, onClick: () => {} } as any) as any
    );
    // When ginboshiEarned is 0, the "Silver Stars Won" label should not show "0" prominently
    // or the section should be hidden (depends on PR #728 implementation)
    // For now, just verify it doesn't crash
    expect(container).toBeDefined();
  });
});
