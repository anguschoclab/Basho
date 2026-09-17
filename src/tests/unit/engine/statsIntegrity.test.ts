import { describe, it, expect } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { applyWeeklyTraining } from "@/engine/systems/training/TrainingService";
import { applyMentorshipBonuses } from "@/engine/systems/training/MentorshipService";
import { applyWeeklySparring } from "@/engine/systems/training/SparringService";
import { SimTuningService } from "@/engine/simulation/SimTuningService";
import { makeMockWorld, makeMockBasho, mockRikishi } from "./utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { RikishiStats } from "@/engine/types/rikishi";

const allStatsFinite = (stats: RikishiStats) =>
  Object.values(stats).every((v) => typeof v !== "number" || Number.isFinite(v));

const bashoHistoryEntry = (yushoId: string) =>
  ({
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    yusho: yushoId,
    junYusho: [],
    ginoSho: "none",
    shukunsho: "none",
    kantosho: "none",
    id: "hatsu-2025",
  }) as never;

describe("stats integrity (no NaN, no wipe)", () => {
  it("publishBanzukeUpdate preserves the full stats object for a normal rikishi", () => {
    const world = makeMockWorld({ cyclePhase: "post_basho", history: [bashoHistoryEntry("r2")] });
    const r = mockRikishi("r1", {
      rank: "maegashira",
      power: 71,
      speed: 63,
      technique: 55,
      aggression: 62,
      experience: 42,
    });
    world.rikishi.set("r1", r);
    world.activeRikishiIds = new Set(["r1"]);
    world.currentBasho = makeMockBasho({
      bashoName: "hatsu",
      standings: new Map([["r1", { wins: 9, losses: 6, absences: 0 }]]),
    });

    const next = resolveImpacts(world, [publishBanzukeUpdate(world)]).rikishi.get("r1")!;
    // The banzuke publisher must never clobber the stats object: weight,
    // achievements, experience and aggression have no business being touched.
    expect(next.stats.weight).toBe(140);
    expect(next.stats.achievements).toBeDefined();
    expect(next.stats.experience).toBe(42);
    expect(next.stats.aggression).toBe(62);
    expect(next.stats.power).toBe(71);
    expect(next.stats.technique).toBe(55);
    expect(allStatsFinite(next.stats)).toBe(true);
  });

  it("publishBanzukeUpdate debuffs warned yokozuna without dropping other stats", () => {
    const world = makeMockWorld({ cyclePhase: "post_basho", history: [bashoHistoryEntry("r2")] });
    const r = mockRikishi("r1", {
      rank: "yokozuna",
      power: 80,
      mental: 70,
      technique: 75,
      aggression: 66,
      experience: 99,
      pressureScore: 1, // subpar basho makes pressureScore 2 → warning fires
    });
    world.rikishi.set("r1", r);
    world.activeRikishiIds = new Set(["r1"]);
    world.currentBasho = makeMockBasho({
      bashoName: "hatsu",
      standings: new Map([["r1", { wins: 9, losses: 6, absences: 0 }]]),
    });

    const next = resolveImpacts(world, [publishBanzukeUpdate(world)]).rikishi.get("r1")!;
    expect(next.stats.mental).toBeCloseTo(63, 1); // 70 * 0.9
    expect(next.stats.technique).toBeCloseTo(67.5, 1); // 75 * 0.9
    expect(next.stats.power).toBe(80);
    expect(next.stats.aggression).toBe(66);
    expect(next.stats.weight).toBe(140);
    expect(next.stats.experience).toBe(99);
    expect(allStatsFinite(next.stats)).toBe(true);
  });

  it("applyWeeklyTraining keeps every STAT_GROUP key finite when stats lack aggression", () => {
    const world = makeMockWorld({});
    const partial = {
      power: 60,
      speed: 55,
      technique: 50,
      balance: 52,
      stamina: 48,
      mental: 45,
      adaptability: 50,
      // aggression intentionally missing — the STAT_GROUP enforcement loop
      // previously ran Math.min(ceiling, undefined) → NaN
    } as RikishiStats;
    const r = mockRikishi("r1", { injured: false });
    r.stats = partial;
    r.heyaId = "h1";
    world.rikishi.set("r1", r);
    world.activeRikishiIds = new Set(["r1"]);

    const next = resolveImpacts(world, [applyWeeklyTraining(world)]).rikishi.get("r1")!;
    for (const key of ["power", "speed", "technique", "balance", "stamina", "mental", "adaptability", "aggression"] as const) {
      expect(Number.isFinite(next.stats[key]), `stats.${key} should be finite`).toBe(true);
    }
  });

  it("applyMentorshipBonuses never writes NaN when stats fields are absent", () => {
    const world = makeMockWorld({});
    const mentor = mockRikishi("m1", { rank: "ozeki", technique: 90 });
    mentor.heyaId = "h1";
    const apprentice = mockRikishi("a1", { rank: "jonokuchi", technique: 30 });
    apprentice.heyaId = "h1";
    apprentice.mentorId = "m1";
    // Strip a field the bleed math reads — must not poison the write.
    (apprentice.stats as unknown as Record<string, unknown>).technique = undefined;
    world.rikishi.set("m1", mentor);
    world.rikishi.set("a1", apprentice);
    world.activeRikishiIds = new Set(["m1", "a1"]);

    const next = resolveImpacts(world, [applyMentorshipBonuses(world)]).rikishi.get("a1")!;
    expect(allStatsFinite(next.stats)).toBe(true);
  });

  it("applyWeeklySparring never propagates a NaN stat into the four bleed stats", () => {
    const world = makeMockWorld({});
    const a = mockRikishi("a1", { power: 80, speed: 75, technique: 70 });
    const b = mockRikishi("b1", { power: 40, speed: 35, technique: 30 });
    a.heyaId = "h1";
    b.heyaId = "h1";
    // NaN on the weaker partner — sparring must not write it back into stats.
    (b.stats as unknown as Record<string, unknown>).technique = NaN;
    world.rikishi.set("a1", a);
    world.rikishi.set("b1", b);
    world.activeRikishiIds = new Set(["a1", "b1"]);
    (world as unknown as Record<string, unknown>).sparringPairs = new Map([
      [
        "h1",
        {
          heyaId: "h1",
          pairs: {
            "a1|b1": { aId: "a1", bId: "b1", chemistry: "friction", weeksActive: 0 },
          },
        },
      ],
    ]);

    const nextWorld = resolveImpacts(world, [applyWeeklySparring(world)]);
    expect(allStatsFinite(nextWorld.rikishi.get("a1")!.stats)).toBe(true);
    expect(allStatsFinite(nextWorld.rikishi.get("b1")!.stats)).toBe(true);
  });

  it("SimTuningService.statAverages stay finite when a rikishi carries a NaN stat", () => {
    const world = makeMockWorld({});
    const r = mockRikishi("r1", { power: 70 });
    (r.stats as unknown as Record<string, unknown>).power = NaN;
    world.rikishi.set("r1", r);
    world.activeRikishiIds = new Set(["r1"]);

    const metrics = SimTuningService.calculateMetrics(world);
    expect(Number.isFinite(metrics.statAverages.power)).toBe(true);
    expect(Number.isFinite(metrics.statAverages.speed)).toBe(true);
    expect(Number.isFinite(metrics.statAverages.technique)).toBe(true);
    expect(Number.isFinite(metrics.statAverages.stamina)).toBe(true);
  });
});
