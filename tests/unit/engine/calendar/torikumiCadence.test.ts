import { describe, it, expect } from "vitest";
import {
  computeRollingTorikumiTargetDay,
  ensureRollingTorikumi,
  reconcileFutureScheduleForWithdrawals,
} from "@/engine/calendar/schedule";
import { buildStartBashoImpact } from "@/engine/lifecycle/BashoManager";
import { advanceBashoDay } from "@/engine/core/world";
import { withdrawRikishi } from "@/engine/health/HealthActions";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

function buildMakuuchiRosterWorld(): WorldState {
  const world = makeMockWorld({
    seed: "torikumi-cadence-seed",
    cyclePhase: "pre_basho",
    currentBashoName: "hatsu",
  });
  for (let h = 1; h <= 4; h++) {
    world.heyas.set(`heya-${h}`, makeMockHeya(`heya-${h}`));
  }
  for (let i = 1; i <= 8; i++) {
    const id = `m-${i}`;
    const r: Rikishi = mockRikishi(id, {
      heyaId: `heya-${((i - 1) % 4) + 1}`,
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: Math.ceil(i / 2),
      side: i % 2 === 1 ? "east" : "west",
    });
    world.rikishi.set(id, r);
    world.activeRikishiIds.add(id);
  }
  return world;
}

describe("§3 Torikumi posting cadence (rolling lookahead)", () => {
  it("computes the JSA rolling target day (D1+D2 together, D+1 on Days 2-13, holds D15 on D14)", () => {
    expect(computeRollingTorikumiTargetDay(1)).toBe(2);
    expect(computeRollingTorikumiTargetDay(2)).toBe(3);
    expect(computeRollingTorikumiTargetDay(13)).toBe(14);
    expect(computeRollingTorikumiTargetDay(14)).toBe(14);
    expect(computeRollingTorikumiTargetDay(15)).toBe(15);
  });

  it("posts Days 1 and 2 together at basho start without repeating pairings", () => {
    const world = buildMakuuchiRosterWorld();
    const startImpact = buildStartBashoImpact(world, "hatsu");
    const active = resolveImpacts(world, [startImpact]);

    const basho = active.currentBasho;
    expect(basho).toBeDefined();
    expect(basho?.postedThroughDay).toBe(2);

    const day1 = (basho?.matches ?? []).filter((m) => m.day === 1);
    const day2 = (basho?.matches ?? []).filter((m) => m.day === 2);
    expect(day1).toHaveLength(4);
    expect(day2).toHaveLength(4);

    // No pair of rikishi faces each other on both Day 1 and Day 2.
    const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);
    const day1Pairs = new Set(day1.map((m) => pairKey(m.eastRikishiId, m.westRikishiId)));
    for (const m of day2) {
      expect(day1Pairs.has(pairKey(m.eastRikishiId, m.westRikishiId))).toBe(false);
    }
  });

  it("posts D+1 on advanceBashoDay for Days 2-13, holds Day 15 on Day 14, and posts Day 15 on Day 15", () => {
    const base = buildMakuuchiRosterWorld();
    let world = resolveImpacts(base, [buildStartBashoImpact(base, "hatsu")]);

    // Advance from Day 1 → Day 2: Day 3 is now posted; queued Day 2 tactic survives.
    const day2BoutId = world.currentBasho?.matches.find((m) => m.day === 2)?.boutId ?? "b2";
    const day1BoutId = world.currentBasho?.matches.find((m) => m.day === 1)?.boutId ?? "b1";
    world = {
      ...world,
      boutTactics: {
        [day1BoutId]: "yorikiri_push" as never,
        [day2BoutId]: "henka_dodge" as never,
      },
    };
    world = advanceBashoDay(world);
    expect(world.currentBasho?.day).toBe(2);
    expect(world.currentBasho?.postedThroughDay).toBe(3);
    expect(world.currentBasho?.matches.some((m) => m.day === 3)).toBe(true);
    expect(world.boutTactics?.[day2BoutId]).toBe("henka_dodge");
    expect(world.boutTactics?.[day1BoutId]).toBeUndefined();

    // Jump to Day 13 and advance to Day 14: Day 15 must NOT be posted yet.
    world = {
      ...world,
      currentBasho: { ...world.currentBasho!, day: 13, currentDay: 13, postedThroughDay: 14 },
    };
    world = resolveImpacts(world, [ensureRollingTorikumi(world, 14)]);
    world = advanceBashoDay(world);
    expect(world.currentBasho?.day).toBe(14);
    expect(world.currentBasho?.postedThroughDay).toBe(14);
    expect(world.currentBasho?.matches.some((m) => m.day === 15)).toBe(false);

    // Advance from Day 14 → Day 15: Day 15 (Senshuraku) is now posted.
    world = advanceBashoDay(world);
    expect(world.currentBasho?.day).toBe(15);
    expect(world.currentBasho?.postedThroughDay).toBe(15);
    expect(world.currentBasho?.matches.some((m) => m.day === 15)).toBe(true);
  });

  it("keeps every posted bout on withdrawal — published cards are locked and resolve as fusenshō", () => {
    const base = buildMakuuchiRosterWorld();
    let world = resolveImpacts(base, [buildStartBashoImpact(base, "hatsu")]);

    // m-1 withdraws on Day 1 while Day 1 and Day 2 are both posted.
    const withdrawImpact = withdrawRikishi(world, "m-1");
    world = resolveImpacts(world, [withdrawImpact]);

    const day1WithM1 = (world.currentBasho?.matches ?? []).filter(
      (m) => m.day === 1 && (m.eastRikishiId === "m-1" || m.westRikishiId === "m-1")
    );
    const day2WithM1 = (world.currentBasho?.matches ?? []).filter(
      (m) => m.day === 2 && (m.eastRikishiId === "m-1" || m.westRikishiId === "m-1")
    );
    // Real JSA rule: once a day's card is published it is LOCKED — both
    // posted bouts stay; each resolves as a fusenshō when the day runs.
    expect(day1WithM1).toHaveLength(1);
    expect(day2WithM1).toHaveLength(1);

    // Reconciliation never rewrites the card — only the kyūjō flag moves.
    const noop = reconcileFutureScheduleForWithdrawals(world, "m-1");
    expect(noop.worldFields?.currentBasho).toBeUndefined();
  });
});
