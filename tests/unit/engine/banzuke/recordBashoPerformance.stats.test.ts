import { describe, it, expect } from "vitest";
import { recordBashoPerformance } from "@/engine/banzuke/publish/performance";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
import type { BashoState } from "@/engine/types/basho";
import type { RikishiStats } from "@/engine/types/rikishi";

const stats = (v: number): RikishiStats =>
  ({
    power: v,
    technique: v,
    speed: v,
    weight: 150,
    stamina: v,
    mental: v,
    adaptability: v,
    balance: v,
    aggression: v,
    experience: v,
  }) as RikishiStats;

const tracked = (statsUpdate: Partial<RikishiStats> = {}) => ({
  consecutiveStrongOzeki: 0,
  consecutiveMakeKoshi: 0,
  consecutiveKachiKoshi: 1,
  consecutiveKyujo: 0,
  pressureScore: 0,
  councilWarnings: 0,
  statsUpdate,
});

describe("recordBashoPerformance — stat snapshot on careerHistory", () => {
  it("captures the post-basho stats on the appended career entry", () => {
    const r = mockRikishi("r1", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 10,
      stats: stats(60),
      careerHistory: [],
    });
    const world = makeMockWorld({
      year: 2025,
      history: [],
      rikishi: new Map([["r1", r]]),
    });
    const lastBasho = {
      bashoName: "hatsu",
      matches: [],
      standings: new Map(),
      boutMetrics: {},
    } as unknown as BashoState;
    const builder = createImpactBuilder("test");

    recordBashoPerformance(
      world,
      lastBasho,
      r,
      { wins: 10, losses: 5, absences: 0 } as never,
      false,
      false,
      [],
      tracked({ technique: 63 }),
      builder
    );

    const next = resolveImpacts(world, [builder.build()]);
    const entry = next.rikishi.get("r1")!.careerHistory!.at(-1)!;
    expect(entry.stats).toBeDefined();
    // Post-update values — the snapshot reads what the rikishi sheet shows.
    expect(entry.stats!.technique).toBe(63);
    expect(entry.stats!.power).toBe(60);
  });

  it("stat snapshots stay bounded with the 6-entry career history window", () => {
    const prior = Array.from({ length: 6 }, (_, i) => ({
      id: `hatsu-200${i}-r1`,
      bashoId: `hatsu-200${i}`,
      year: 2000 + i,
      month: 1,
      bashoName: "hatsu",
      rank: "maegashira" as const,
      division: "makuuchi" as const,
      rankNumber: 10,
      side: "east" as const,
      wins: 8,
      losses: 7,
      absences: 0,
      isYusho: false,
      isJunYusho: false,
      specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
      weight: 150,
      momentum: 0,
    }));
    const r = mockRikishi("r1", {
      heyaId: "h1",
      division: "makuuchi",
      rank: "maegashira",
      stats: stats(60),
      careerHistory: prior,
    });
    const world = makeMockWorld({
      year: 2025,
      history: [],
      rikishi: new Map([["r1", r]]),
    });
    const lastBasho = {
      bashoName: "haru",
      matches: [],
      standings: new Map(),
      boutMetrics: {},
    } as unknown as BashoState;
    const builder = createImpactBuilder("test");

    recordBashoPerformance(
      world,
      lastBasho,
      r,
      { wins: 9, losses: 6, absences: 0 } as never,
      false,
      false,
      [],
      tracked(),
      builder
    );

    const next = resolveImpacts(world, [builder.build()]);
    const hist = next.rikishi.get("r1")!.careerHistory!;
    expect(hist.length).toBeLessThanOrEqual(6);
    expect(hist.at(-1)!.stats).toBeDefined();
    // Entries pushed out of the window lose their stats with the entry —
    // memory stays bounded over a 25-yr career.
    expect(hist.filter((e) => e.stats).length).toBeLessThanOrEqual(1);
  });
});
