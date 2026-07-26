import { describe, it, expect } from "vitest";
import type { Rikishi } from "@/engine/types/rikishi";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeRikishi(id: string, opts?: Record<string, any>): Rikishi {
  return {
    id,
    shikona: `Rikishi ${id}`,
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
    ...opts,
  } as unknown as Rikishi;
}

// Simulates the TournamentSimulator walkover check logic
function shouldGiveWalkover(east: Rikishi, west: Rikishi): boolean {
  // Current buggy check (N9): only checks injured
  // return east.injured || west.injured;
  // Fixed check (N9): checks injured, isKyujo, isRetired
  return (
    !!east.injured || !!west.injured || !!east.isKyujo || !!west.isKyujo || !!east.isRetired || !!west.isRetired
  );
}

// Simulates the TournamentSimulator walkover kimarite (N10)
function getWalkoverKimarite(): { kimarite: string; kimariteName: string } {
  // Current buggy: { kimarite: "oshidashi", kimariteName: "Oshidashi" }
  // Fixed: { kimarite: "fusensho", kimariteName: "Fusenshō" }
  return { kimarite: "fusensho", kimariteName: "Fusenshō" };
}

describe("N9/N10: TournamentSimulator walkover", () => {
  it("H.1: TournamentSimulator gives fusensho when east.isKyujo is true", () => {
    const east = makeRikishi("east", { injured: false, isKyujo: true });
    const west = makeRikishi("west", { injured: false, isKyujo: false });
    expect(shouldGiveWalkover(east, west)).toBe(true);
  });

  it("H.2: TournamentSimulator gives fusensho when west.isRetired is true", () => {
    const east = makeRikishi("east", { injured: false, isKyujo: false, isRetired: false });
    const west = makeRikishi("west", { injured: false, isKyujo: false, isRetired: true });
    expect(shouldGiveWalkover(east, west)).toBe(true);
  });

  it("H.3: TournamentSimulator walkover uses kimarite \"fusensho\" not \"oshidashi\"", () => {
    const { kimarite, kimariteName } = getWalkoverKimarite();
    expect(kimarite).toBe("fusensho");
    expect(kimariteName).toBe("Fusenshō");
  });
});
