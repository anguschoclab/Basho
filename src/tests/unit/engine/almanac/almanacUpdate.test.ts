import { describe, it, expect, beforeEach } from "vitest";
import { runAlmanacNarrativeUpdate } from "@/engine/almanac/narrativeEnrichment";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import type { BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { PbpLine } from "@/engine/bout/boutNarrative";

function makePbpLine(text: string, opts: Partial<PbpLine> = {}): PbpLine {
  return { text, id: `l-${Math.random()}`, ...opts };
}

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "bout-1",
    winner: "east",
    winnerRikishiId: "r1",
    loserRikishiId: "r2",
    kimarite: "yori-kiri",
    kimariteName: "Yori-kiri",
    stance: "yotsu",
    tachiaiWinner: "east",
    duration: 10,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    momentumScore: 0,
    inBoutInjury: { rikishiId: "", area: "arm", severity: "minor", triggerEvent: "" },
    ...overrides,
  } as BoutResult;
}

function makeMatch(overrides: Partial<MatchSchedule> = {}): MatchSchedule {
  return {
    boutId: "bout-1",
    day: 5,
    eastRikishiId: "r1",
    westRikishiId: "r2",
    ...overrides,
  } as MatchSchedule;
}

describe("runAlmanacNarrativeUpdate", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld();
  });

  it("returns empty impact when no currentBasho", () => {
    world.currentBasho = undefined;
    const impact = runAlmanacNarrativeUpdate(world);
    expect(impact.entities?.rikishiUpdates).toBeUndefined();
  });

  it("scans basho.matches for notable bouts per active rikishi", () => {
    const r1 = mockRikishi("r1", { careerWins: 99 });
    const r2 = mockRikishi("r2", { careerWins: 10 });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const result = makeBoutResult({
      boutId: "b-notable",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      isKinboshi: true,
      pbpLines: [makePbpLine("Kinboshi!", { tags: ["kinboshi"] })],
    });
    const basho = makeMockBasho({
      matches: [makeMatch({ result })],
    });
    world.currentBasho = basho;

    const impact = runAlmanacNarrativeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const updated = newWorld.rikishi.get("r1");
    expect(updated?.almanacRecord?.notableBouts?.length).toBeGreaterThan(0);
  });

  it("builds NotableBoutEntry for each notable bout", () => {
    const r1 = mockRikishi("r1", { careerWins: 5 });
    const r2 = mockRikishi("r2", { careerWins: 5 });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const result = makeBoutResult({
      boutId: "b-upset",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      upset: true,
      pbpLines: [makePbpLine("Upset!", { tags: ["upset"] })],
    });
    world.currentBasho = makeMockBasho({ matches: [makeMatch({ result })] });

    const impact = runAlmanacNarrativeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const entry = newWorld.rikishi.get("r1")?.almanacRecord?.notableBouts?.[0];
    expect(entry?.boutId).toBe("b-upset");
    expect(entry?.isUpset).toBe(true);
  });

  it("appends to rikishi.almanacRecord.notableBouts", () => {
    const r1 = mockRikishi("r1", { careerWins: 5 });
    r1.almanacRecord = {
      rikishiId: "r1",
      shikona: "Wrestler-r1",
      debutYear: 2010,
      debutBasho: "hatsu",
      totalWins: 5,
      totalLosses: 0,
      totalAbsences: 0,
      yushoCount: 0,
      junYushoCount: 0,
      sanshoCounts: { ginoSho: 0, kantosho: 0, shukunsho: 0 },
      kinboshiCount: 0,
      highestRank: "maegashira",
      ozekiRunCount: 0,
      bashoHistory: [],
      currentWinStreak: 0,
      longestWinStreak: 0,
      currentLossStreak: 0,
      isActive: true,
      notableBouts: [],
      narrativeHighlights: [],
      promotionHistory: [],
    };
    world.rikishi.set("r1", r1);
    const r2 = mockRikishi("r2", { careerWins: 5 });
    world.rikishi.set("r2", r2);

    const result = makeBoutResult({
      boutId: "b-new",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      isKinboshi: true,
      pbpLines: [makePbpLine("Kinboshi!", { tags: ["kinboshi"] })],
    });
    world.currentBasho = makeMockBasho({ matches: [makeMatch({ result })] });

    const impact = runAlmanacNarrativeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const bouts = newWorld.rikishi.get("r1")?.almanacRecord?.notableBouts;
    expect(bouts?.length).toBe(1);
  });

  it("appends NarrativeHighlight for each notable bout", () => {
    const r1 = mockRikishi("r1", { careerWins: 5 });
    const r2 = mockRikishi("r2", { careerWins: 5 });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const result = makeBoutResult({
      boutId: "b-kinboshi",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      isKinboshi: true,
      pbpLines: [makePbpLine("Kinboshi!", { tags: ["kinboshi"] })],
    });
    world.currentBasho = makeMockBasho({ matches: [makeMatch({ result })] });

    const impact = runAlmanacNarrativeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const highlights = newWorld.rikishi.get("r1")?.almanacRecord?.narrativeHighlights;
    expect(highlights?.some((h) => h.type === "kinboshi")).toBe(true);
  });

  it("creates almanacRecord if it doesn't exist", () => {
    const r1 = mockRikishi("r1", { careerWins: 5 });
    const r2 = mockRikishi("r2", { careerWins: 5 });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const result = makeBoutResult({
      boutId: "b-create",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      isKinboshi: true,
      pbpLines: [makePbpLine("Kinboshi!", { tags: ["kinboshi"] })],
    });
    world.currentBasho = makeMockBasho({ matches: [makeMatch({ result })] });

    expect(r1.almanacRecord).toBeUndefined();
    const impact = runAlmanacNarrativeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    expect(newWorld.rikishi.get("r1")?.almanacRecord).toBeDefined();
  });

  it("handles rikishi with no notable bouts (no changes to notableBouts)", () => {
    const r1 = mockRikishi("r1", { careerWins: 5 });
    const r2 = mockRikishi("r2", { careerWins: 5 });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const result = makeBoutResult({
      boutId: "b-routine",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      upset: false,
      excitementScore: 10,
      pbpLines: [makePbpLine("Routine", { tags: ["crowd_roar"] })],
    });
    world.currentBasho = makeMockBasho({ matches: [makeMatch({ result })] });

    const impact = runAlmanacNarrativeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const bouts = newWorld.rikishi.get("r1")?.almanacRecord?.notableBouts;
    expect(bouts?.length ?? 0).toBe(0);
  });

  it("respects memory caps (does not exceed max entries)", () => {
    const r1 = mockRikishi("r1", { careerWins: 5 });
    const r2 = mockRikishi("r2", { careerWins: 5 });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const matches: MatchSchedule[] = [];
    for (let i = 0; i < 60; i++) {
      const result = makeBoutResult({
        boutId: `b-${i}`,
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
        isKinboshi: true,
        pbpLines: [makePbpLine("Kinboshi!", { tags: ["kinboshi"] })],
      });
      matches.push(makeMatch({ boutId: `b-${i}`, result }));
    }
    world.currentBasho = makeMockBasho({ matches });

    const impact = runAlmanacNarrativeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const bouts = newWorld.rikishi.get("r1")?.almanacRecord?.notableBouts;
    expect((bouts ?? []).length).toBeLessThanOrEqual(50);
  });

  it("does NOT build promotionHistory (that's in Phase 4B)", () => {
    const r1 = mockRikishi("r1", { careerWins: 5 });
    const r2 = mockRikishi("r2", { careerWins: 5 });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);

    const result = makeBoutResult({
      boutId: "b-test",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      isKinboshi: true,
      pbpLines: [makePbpLine("Kinboshi!", { tags: ["kinboshi"] })],
    });
    world.currentBasho = makeMockBasho({ matches: [makeMatch({ result })] });

    const impact = runAlmanacNarrativeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    expect(promHistory ?? []).toEqual([]);
  });
});
