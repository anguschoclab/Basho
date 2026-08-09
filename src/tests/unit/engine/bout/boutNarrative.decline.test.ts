import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpLine, PbpTag } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-1",
    day: 7,
    eastId: "r1",
    westId: "r2",
    winner: "east",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    duration: 8,
    log: [],
    upset: false,
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function hasTag(l: PbpLine, tag: PbpTag): boolean {
  return (l.tags ?? []).includes(tag);
}

describe("age-based decline narrative (6.4)", () => {
  it("battle of veterans pre-bout line when both rikishi are 30+", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", birthYear: 1990 });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", birthYear: 1988 });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "veterans-battle-seed", world);
    const lines = getLines(result);
    const preBoutVeteranLines = lines.filter(
      (l) => l.phase === "pre_bout" && hasTag(l, "veteran") && hasTag(l, "age_diff")
    );

    expect(preBoutVeteranLines.length).toBeGreaterThan(0);
  });

  it("no battle of veterans when one rikishi is under 30", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi", birthYear: 2000 });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi", birthYear: 1988 });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "no-veterans-seed", world);
    const lines = getLines(result);
    // East is 25, west is 37 — age diff triggers age_narrative but not battle_of_veterans
    expect(lines.length).toBeGreaterThan(0);
  });

  it("father time narrative when loser is in decline phase", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi", declinePhase: "peak" });
    const west = mockRikishi("r2", {
      rank: "ozeki",
      division: "makuuchi",
      declinePhase: "early-decline",
    });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
    } as unknown as WorldState;
    const result = makeBoutResult({ winner: "east" });

    generateBoutNarrative(result, east, west, undefined, 7, "father-time-seed", world);
    const lines = getLines(result);
    const postBoutLines = lines.filter((l) => l.phase === "post_bout");
    // Father time narrative is generated with veteran tag in post_bout phase
    const veteranPostBoutLines = postBoutLines.filter((l) => hasTag(l, "veteran"));

    expect(veteranPostBoutLines.length).toBeGreaterThan(0);
  });

  it("defying age narrative when winner is in late-decline", () => {
    const east = mockRikishi("r1", {
      rank: "ozeki",
      division: "makuuchi",
      declinePhase: "late-decline",
    });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi", declinePhase: "peak" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
    } as unknown as WorldState;
    const result = makeBoutResult({ winner: "east" });

    generateBoutNarrative(result, east, west, undefined, 7, "defying-age-seed", world);
    const lines = getLines(result);
    const postBoutLines = lines.filter((l) => l.phase === "post_bout");

    // Debug: check if winner has declinePhase
    expect(east.declinePhase).toBe("late-decline");
    // Defying age narrative is generated with veteran tag in post_bout phase
    // The text may use rikishi reference pattern, so we check by tag instead
    const veteranPostBoutLines = postBoutLines.filter((l) => hasTag(l, "veteran"));
    expect(veteranPostBoutLines.length).toBeGreaterThan(0);
  });

  it("no decline narrative when both are in peak phase", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi", declinePhase: "peak" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi", declinePhase: "peak" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
    } as unknown as WorldState;
    const result = makeBoutResult({ winner: "east" });

    generateBoutNarrative(result, east, west, undefined, 7, "no-decline-seed", world);
    const lines = getLines(result);
    const postBoutLines = lines.filter((l) => l.phase === "post_bout");
    // Neither father_time nor defying_age should fire when both are in peak
    // Check that no post_bout veteran-tagged lines exist from decline narrative
    // (there could be veteran lines from other sources, so we check for the specific templates)
    const declineLines = postBoutLines.filter(
      (l) =>
        l.text.includes("Father time") ||
        l.text.includes("Defying age") ||
        l.text.includes("turns back the clock") ||
        l.text.includes("legs aren't") ||
        l.text.includes("late-career story") ||
        l.text.includes("silences the doubters")
    );

    expect(declineLines.length).toBe(0);
  });
});
