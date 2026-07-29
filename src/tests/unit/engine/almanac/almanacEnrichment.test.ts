import { describe, it, expect, beforeEach } from "vitest";
import {
  buildNotableBoutEntry,
  enrichAlmanacRecord,
  createEmptyAlmanacRecord,
} from "@/engine/almanac/narrativeEnrichment";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoResult, KeyBoutEntry } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RikishiCareerRecord } from "@/engine/almanac/types";
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

function makeBashoResult(overrides: Partial<BashoResult> = {}): BashoResult {
  return {
    id: "basho-1",
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    yusho: "r1",
    junYusho: [],
    ginoSho: "none",
    shukunsho: "none",
    kantosho: "none",
    stats: [],
    ...overrides,
  } as BashoResult;
}

describe("buildNotableBoutEntry", () => {
  const world = makeMockWorld();
  const r1 = mockRikishi("r1");
  const r2 = mockRikishi("r2", { shikona: "Opponent" });
  world.rikishi.set("r1", r1);
  world.rikishi.set("r2", r2);

  it("builds entry from BoutResult with pbpLines", () => {
    const result = makeBoutResult({
      pbpLines: [makePbpLine("Milestone!", { tags: ["milestone"] })],
    });
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry).not.toBeNull();
    expect(entry?.narrativeLines).toEqual(["Milestone!"]);
  });

  it("sets winner=true when rikishi is the winner", () => {
    const result = makeBoutResult({ winnerRikishiId: "r1", loserRikishiId: "r2" });
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry?.winner).toBe(true);
  });

  it("sets winner=false when rikishi is the loser", () => {
    const result = makeBoutResult({ winnerRikishiId: "r2", loserRikishiId: "r1" });
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry?.winner).toBe(false);
  });

  it("extracts only notable narrative lines", () => {
    const result = makeBoutResult({
      pbpLines: [
        makePbpLine("Notable", { tags: ["milestone"] }),
        makePbpLine("Not notable", { tags: ["crowd_roar"] }),
        makePbpLine("Also notable", { tags: ["upset"] }),
      ],
    });
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry?.narrativeLines).toEqual(["Notable", "Also notable"]);
  });

  it("includes opponent shikona from world", () => {
    const result = makeBoutResult({ winnerRikishiId: "r1", loserRikishiId: "r2" });
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry?.opponentShikona).toBe("Opponent");
  });

  it("includes kimarite from result", () => {
    const result = makeBoutResult({ kimarite: "uwatenage" });
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry?.kimarite).toBe("uwatenage");
  });

  it("includes isKinboshi, isUpset, isYushoRace flags", () => {
    const result = makeBoutResult({ isKinboshi: true, upset: true, isYushoRace: true });
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry?.isKinboshi).toBe(true);
    expect(entry?.isUpset).toBe(true);
    expect(entry?.isYushoRace).toBe(true);
  });

  it("includes excitementScore when present", () => {
    const result = makeBoutResult({ excitementScore: 42 });
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry?.excitementScore).toBe(42);
  });

  it("handles bout with no pbpLines (empty narrativeLines array)", () => {
    const result = makeBoutResult();
    const entry = buildNotableBoutEntry(result, "r1", world, "hatsu", 2025, 5);
    expect(entry?.narrativeLines).toEqual([]);
  });

  it("returns null when rikishi not in this bout", () => {
    const result = makeBoutResult({ winnerRikishiId: "r1", loserRikishiId: "r2" });
    const entry = buildNotableBoutEntry(result, "r3", world, "hatsu", 2025, 5);
    expect(entry).toBeNull();
  });
});

describe("enrichAlmanacRecord", () => {
  let world: ReturnType<typeof makeMockWorld>;
  let rikishi: Rikishi;
  let record: RikishiCareerRecord;

  beforeEach(() => {
    world = makeMockWorld();
    rikishi = mockRikishi("r1", { shikona: "TestRikishi" });
    world.rikishi.set("r1", rikishi);
    record = createEmptyAlmanacRecord(rikishi);
  });

  it("returns record unchanged when no world history", () => {
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.notableBouts).toEqual([]);
    expect(enriched.narrativeHighlights).toEqual([]);
  });

  it("scans world.history keyBouts for rikishi appearances", () => {
    const bout = makeBoutResult({
      boutId: "kb-1",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      pbpLines: [makePbpLine("Milestone", { tags: ["milestone"] })],
    });
    const keyBout: KeyBoutEntry = {
      label: "yusho_decider",
      bout,
      day: 15,
      eastRikishiId: "r1",
      westRikishiId: "r2",
    };
    const bashoResult = makeBashoResult({ keyBouts: [keyBout] });
    world.history = [bashoResult];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.notableBouts?.length).toBeGreaterThan(0);
  });

  it("builds NotableBoutEntry from keyBout involving rikishi", () => {
    const bout = makeBoutResult({
      boutId: "kb-2",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      isKinboshi: true,
      pbpLines: [makePbpLine("Kinboshi!", { tags: ["kinboshi"] })],
    });
    const keyBout: KeyBoutEntry = {
      label: "kinboshi",
      bout,
      day: 10,
      eastRikishiId: "r1",
      westRikishiId: "r2",
    };
    world.history = [makeBashoResult({ keyBouts: [keyBout] })];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.notableBouts?.[0]?.boutId).toBe("kb-2");
    expect(enriched.notableBouts?.[0]?.isKinboshi).toBe(true);
  });

  it("does not duplicate bouts already in notableBouts", () => {
    const bout = makeBoutResult({
      boutId: "kb-3",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      pbpLines: [makePbpLine("Milestone", { tags: ["milestone"] })],
    });
    const keyBout: KeyBoutEntry = {
      label: "yusho_decider",
      bout,
      day: 15,
      eastRikishiId: "r1",
      westRikishiId: "r2",
    };
    world.history = [makeBashoResult({ keyBouts: [keyBout] })];
    record.notableBouts = [
      {
        boutId: "kb-3",
        year: 2025,
        bashoName: "hatsu",
        day: 15,
        opponentId: "r2",
        opponentShikona: "Opponent",
        winner: true,
        kimarite: "yori-kiri",
        isKinboshi: false,
        isUpset: false,
        isYushoRace: false,
        narrativeLines: ["Milestone"],
      },
    ];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.notableBouts?.length).toBe(1);
  });

  it("builds narrativeHighlights from milestones array", () => {
    rikishi.milestones = [
      {
        id: "m1",
        type: "yusho",
        title: "First Yusho",
        description: "Won first tournament",
        date: { year: 2025, month: 1 },
      },
    ];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.narrativeHighlights?.some((h: { type: string }) => h.type === "yusho")).toBe(true);
  });

  it("builds narrativeHighlights from notable bouts", () => {
    const bout = makeBoutResult({
      boutId: "kb-4",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      isKinboshi: true,
      pbpLines: [makePbpLine("Kinboshi!", { tags: ["kinboshi"] })],
    });
    const keyBout: KeyBoutEntry = {
      label: "kinboshi",
      bout,
      day: 10,
      eastRikishiId: "r1",
      westRikishiId: "r2",
    };
    world.history = [makeBashoResult({ keyBouts: [keyBout] })];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.narrativeHighlights?.some((h: { type: string }) => h.type === "kinboshi")).toBe(true);
  });

  it("sorts narrativeHighlights chronologically (most recent first)", () => {
    rikishi.milestones = [
      {
        id: "m1",
        type: "yusho",
        title: "Old Yusho",
        description: "Old",
        date: { year: 2023, month: 1 },
      },
      {
        id: "m2",
        type: "yusho",
        title: "New Yusho",
        description: "New",
        date: { year: 2025, month: 1 },
      },
    ];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.narrativeHighlights?.[0].year).toBeGreaterThanOrEqual(
      enriched.narrativeHighlights?.[1]?.year ?? 0
    );
  });

  it("sorts notableBouts chronologically (most recent first)", () => {
    const bout1 = makeBoutResult({
      boutId: "kb-old",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      pbpLines: [makePbpLine("Milestone", { tags: ["milestone"] })],
    });
    const bout2 = makeBoutResult({
      boutId: "kb-new",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
      pbpLines: [makePbpLine("Milestone", { tags: ["milestone"] })],
    });
    world.history = [
      makeBashoResult({ year: 2024, keyBouts: [{ label: "yusho_decider", bout: bout1, day: 15, eastRikishiId: "r1", westRikishiId: "r2" }] }),
      makeBashoResult({ year: 2025, keyBouts: [{ label: "yusho_decider", bout: bout2, day: 15, eastRikishiId: "r1", westRikishiId: "r2" }] }),
    ];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.notableBouts?.[0].year).toBeGreaterThanOrEqual(
      enriched.notableBouts?.[1]?.year ?? 0
    );
  });

  it("limits notableBouts to MAX_NOTABLE_BOUTS entries", () => {
    const keyBouts: KeyBoutEntry[] = [];
    for (let i = 0; i < 60; i++) {
      keyBouts.push({
        label: "yusho_decider",
        bout: makeBoutResult({
          boutId: `kb-${i}`,
          winnerRikishiId: "r1",
          loserRikishiId: "r2",
          pbpLines: [makePbpLine("Milestone", { tags: ["milestone"] })],
        }),
        day: 15,
        eastRikishiId: "r1",
        westRikishiId: "r2",
      });
    }
    world.history = [makeBashoResult({ keyBouts })];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect((enriched.notableBouts ?? []).length).toBeLessThanOrEqual(50);
  });

  it("limits narrativeHighlights to MAX_NARRATIVE_HIGHLIGHTS entries", () => {
    const milestones = [];
    for (let i = 0; i < 120; i++) {
      milestones.push({
        id: `m-${i}`,
        type: "yusho" as const,
        title: `Yusho ${i}`,
        description: `Description ${i}`,
        date: { year: 2000 + i, month: 1 },
      });
    }
    rikishi.milestones = milestones;
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect((enriched.narrativeHighlights ?? []).length).toBeLessThanOrEqual(100);
  });

  it("handles rikishi with no milestones or notable bouts", () => {
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.notableBouts).toEqual([]);
    expect(enriched.narrativeHighlights).toEqual([]);
  });

  it("handles rikishi not in any keyBouts", () => {
    const bout = makeBoutResult({
      boutId: "kb-other",
      winnerRikishiId: "r3",
      loserRikishiId: "r4",
      pbpLines: [makePbpLine("Milestone", { tags: ["milestone"] })],
    });
    world.history = [
      makeBashoResult({ keyBouts: [{ label: "yusho_decider", bout, day: 15, eastRikishiId: "r3", westRikishiId: "r4" }] }),
    ];
    const enriched = enrichAlmanacRecord(record, world, rikishi);
    expect(enriched.notableBouts).toEqual([]);
  });
});
