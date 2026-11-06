/**
 * publicInjury.test.ts
 * ===================
 * projectPublicInjuryAvailability — the always-public injury/availability
 * surface for compare views (constitution §42.3.6). Presence and duration are
 * public at every disclosure tier; diagnosis specificity follows the existing
 * rikishi scouting level. Historical fields derive only from the public
 * careerHistory record — never from hidden proneness/durability stats.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { projectPublicInjuryAvailability } from "@/presenters/rikishi/transformers/publicInjury";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";
import type { Division } from "@/engine/types/banzuke";
import type { WorldState } from "@/engine/types/world";
import type { ScoutedRikishi } from "@/engine/recruitment/ScoutingService";

const PLAYER_HEYA = "player_heya";

function historyRow(division: Division, wins: number, losses: number): CareerSnapshot {
  return {
    bashoId: "hatsu-2026",
    year: 2026,
    bashoName: "hatsu",
    rank: division === "makuuchi" ? "maegashira" : division,
    division,
    wins,
    losses,
    absences: 0,
    dayResults: [],
  } as unknown as CareerSnapshot;
}

function worldWith(
  rikishi: Rikishi[],
  opts: { scouting?: Record<string, ScoutedRikishi> } = {}
): WorldState {
  const world = MockFactory.createWorld({
    playerHeyaId: PLAYER_HEYA,
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
  });
  if (opts.scouting) {
    world.playerKnowledge = { scouting: opts.scouting } as WorldState["playerKnowledge"];
  }
  return world;
}

function scoutingEntry(rikishiId: string, scoutingLevel: number): ScoutedRikishi {
  return {
    rikishiId,
    publicInfo: {
      id: rikishiId,
      shikona: `Rikishi ${rikishiId}`,
      rank: "maegashira",
      height: 180,
      weight: 140,
    },
    isOwned: false,
    timesObserved: 0,
    lastObservedWeek: 0,
    scoutingInvestment: "none",
    scoutingLevel,
    attributes: { power: 0, speed: 0, balance: 0, technique: 0, aggression: 0, experience: 0 },
  };
}

function injuredRikishi(id: string, heyaId: string): Rikishi {
  return MockFactory.createRikishi(id, {
    heyaId,
    injured: true,
    injuryWeeksRemaining: 6,
    injuryStatus: {
      type: "tear",
      severity: "serious",
      location: "knee",
      weeksRemaining: 6,
    },
  });
}

describe("projectPublicInjuryAvailability — status", () => {
  it("returns no_record when the id does not resolve to a rikishi (prospects)", () => {
    const world = worldWith([]);
    const p = projectPublicInjuryAvailability(undefined, world);
    expect(p.status).toBe("no_record");
    expect(p.durabilityLabel).toBe("No public record");
    expect(p.recordedBasho).toBe(0);
    expect(p.missedDaysRecent).toBeUndefined();
  });

  it("healthy rikishi with a clean record → status healthy, durable frame", () => {
    const r = MockFactory.createRikishi("r1", {
      heyaId: PLAYER_HEYA,
      careerHistory: [
        historyRow("makuuchi", 8, 7),
        historyRow("makuuchi", 10, 5),
        historyRow("makuuchi", 9, 6),
      ],
    });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.status).toBe("healthy");
    expect(p.statusLabel).toBe("Healthy");
    expect(p.episodeLabel).toBeUndefined();
    expect(p.missedDaysRecent).toBe(0);
    expect(p.recordedBasho).toBe(3);
    expect(p.durability).toBe("durable");
    expect(p.durabilityLabel).toBe("Durable frame");
  });

  it("injured rikishi exposes presence + remaining weeks publicly", () => {
    const r = injuredRikishi("r1", PLAYER_HEYA);
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.status).toBe("injured");
    expect(p.weeksRemaining).toBe(6);
  });

  it("kyūjō for non-injury reasons reports the reason, not an episode", () => {
    const r = MockFactory.createRikishi("r1", {
      heyaId: PLAYER_HEYA,
      isKyujo: true,
      kyujoReason: "personal",
    });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.status).toBe("kyujo");
    expect(p.episodeLabel).toContain("personal");
  });

  it("kyūjō with a filed medical certificate shows the public diagnosis", () => {
    const r = MockFactory.createRikishi("r1", {
      heyaId: "rival_heya",
      isKyujo: true,
      kyujoReason: "injury",
      injured: true,
      injuryWeeksRemaining: 4,
      injuryStatus: { type: "sprain", severity: "minor", location: "ankle", weeksRemaining: 4 },
      medicalCertificate: {
        injury: "Left ankle sprain",
        severity: "minor",
        treatmentWeeks: 4,
        submittedDate: 100,
      },
    });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.status).toBe("kyujo");
    expect(p.episodeLabel).toContain("Left ankle sprain");
  });

  it("recently returned rikishi reports returning status", () => {
    const r = MockFactory.createRikishi("r1", {
      heyaId: PLAYER_HEYA,
      recentlyReturnedFromInjury: true,
    });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.status).toBe("returning");
  });

  it("legacy malformed record: injured flag without injuryStatus degrades honestly", () => {
    const r = MockFactory.createRikishi("r1", {
      heyaId: PLAYER_HEYA,
      injured: true,
      injuryWeeksRemaining: 2,
      injuryStatus: undefined,
    });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.status).toBe("injured");
    expect(p.episodeLabel).toBe("Undisclosed injury");
    expect(p.weeksRemaining).toBe(2);
  });
});

describe("projectPublicInjuryAvailability — disclosure tiers", () => {
  it("owned rikishi always get confirmed diagnosis (exact type + area + severity)", () => {
    const r = injuredRikishi("r1", PLAYER_HEYA);
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.diagnosisTier).toBe("confirmed");
    expect(p.episodeLabel).toContain("Serious");
    expect(p.episodeLabel).toContain("Knee");
    expect(p.episodeLabel).toContain("Tear");
  });

  it("unscouted opponent (level < 20) → undisclosed label, presence still public", () => {
    const r = injuredRikishi("r1", "rival_heya");
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.diagnosisTier).toBe("undisclosed");
    expect(p.episodeLabel).toBe("Undisclosed injury");
    expect(p.weeksRemaining).toBe(6);
  });

  it("opponent at level 30 → reported tier: area only, no exact type", () => {
    const r = injuredRikishi("r1", "rival_heya");
    const world = worldWith([r], { scouting: { r1: scoutingEntry("r1", 30) } });
    const p = projectPublicInjuryAvailability(r, world);
    expect(p.diagnosisTier).toBe("reported");
    expect(p.episodeLabel).toBe("Knee injury");
    expect(p.episodeLabel).not.toContain("Tear");
  });

  it("opponent at level 80 → confirmed tier with full diagnosis", () => {
    const r = injuredRikishi("r1", "rival_heya");
    const world = worldWith([r], { scouting: { r1: scoutingEntry("r1", 80) } });
    const p = projectPublicInjuryAvailability(r, world);
    expect(p.diagnosisTier).toBe("confirmed");
    expect(p.episodeLabel).toContain("Serious");
    expect(p.episodeLabel).toContain("Knee");
    expect(p.episodeLabel).toContain("Tear");
  });
});

describe("projectPublicInjuryAvailability — public record & durability", () => {
  it("derives missed days from careerHistory across mixed divisions", () => {
    const r = MockFactory.createRikishi("r1", {
      heyaId: PLAYER_HEYA,
      careerHistory: [
        historyRow("makuuchi", 8, 5), // 2 missed
        historyRow("makushita", 4, 2), // 1 missed
        historyRow("makuuchi", 0, 0), // 15 missed — full kyūjō
      ],
    });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.missedDaysRecent).toBe(18);
    expect(p.bashosMissedEntirely).toBe(1);
    expect(p.durability).toBe("frequent_absence");
    expect(p.durabilityLabel).toBe("Frequent absence");
  });

  it("thin public record → no pattern, not a fabricated verdict", () => {
    const r = MockFactory.createRikishi("r1", {
      heyaId: PLAYER_HEYA,
      careerHistory: [historyRow("makuuchi", 8, 7)],
    });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.recordedBasho).toBe(1);
    expect(p.durability).toBe("no_pattern");
    expect(p.durabilityLabel).toBe("No clear pattern");
  });

  it("no career history → no fabricated missed-days figure", () => {
    const r = MockFactory.createRikishi("r1", { heyaId: PLAYER_HEYA });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    expect(p.recordedBasho).toBe(0);
    expect(p.missedDaysRecent).toBeUndefined();
    expect(p.durability).toBe("no_pattern");
  });

  it("never exposes hidden proneness or raw durability stats", () => {
    const r = MockFactory.createRikishi("r1", { heyaId: PLAYER_HEYA });
    const p = projectPublicInjuryAvailability(r, worldWith([r]));
    const keys = Object.keys(p);
    for (const k of keys) {
      expect(k).not.toMatch(/prone|proneness|durabilityScore|injuryRisk/i);
    }
  });
});
