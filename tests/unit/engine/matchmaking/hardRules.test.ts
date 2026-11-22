/**
 * Spec (RED) — torikumi hard rules.
 *
 * Real JSA rules (torikumi dataset):
 *  - Stablemates NEVER meet in a regulation honbasho bout — no fallback,
 *    no "forced" tag. (SwissAlgorithm.ts:407 + LowerDivisionSwiss.ts:215
 *    currently pass `avoidSameHeya: false`.)
 *  - No rematches outside the day-15 ketteisen playoff.
 *    (`allowRepeatOverride` / `allowRepeatsWhenForced: true` allow them.)
 *  - Once a day's card is published it is LOCKED: a later withdrawal
 *    produces a fusenshō for the opponent, never a re-paired card.
 *    (`reconcileFutureScheduleForWithdrawals` currently re-pairs.)
 */
import { describe, it, expect } from "vitest";
import { buildSwissTorikumi } from "@/engine/matchmaking/SwissAlgorithm";
import { buildLowerDivisionSwiss } from "@/engine/matchmaking/LowerDivisionSwiss";
import { reconcileFutureScheduleForWithdrawals } from "@/engine/calendar/schedule";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule } from "@/engine/types/basho";

const mk = (id: string, heyaId: string, overrides: Partial<Rikishi> = {}): Rikishi =>
  MockFactory.createRikishi({ id, heyaId, division: "makuuchi", ...overrides });

describe("stablemate bar is absolute", () => {
  it("a two-rikishi same-heya pool produces NO pairing rather than a forced bout", () => {
    const basho = MockFactory.createBasho({ day: 8 });
    const pairings = buildSwissTorikumi(basho, [mk("a1", "heya-a"), mk("a2", "heya-a")], {
      seed: "t",
      day: 8,
    });
    const sameHeya = pairings.filter(
      (p) => [p.eastId, p.westId].includes("a1") && [p.eastId, p.westId].includes("a2")
    );
    expect(sameHeya).toHaveLength(0);
  });

  it("lower-division swiss never tags a pairing same_heya_forced", () => {
    // A four-man same-heya block inside one win bucket must not self-pair.
    const pool = [
      MockFactory.createRikishi({ id: "x1", heyaId: "heya-x", division: "makushita" }),
      MockFactory.createRikishi({ id: "x2", heyaId: "heya-x", division: "makushita" }),
      MockFactory.createRikishi({ id: "x3", heyaId: "heya-x", division: "makushita" }),
      MockFactory.createRikishi({ id: "x4", heyaId: "heya-x", division: "makushita" }),
    ];
    const basho = MockFactory.createBasho({ day: 5 });
    for (const r of pool) basho.standings.set(r.id, { wins: 2, losses: 2 });
    const pairings = buildLowerDivisionSwiss(basho, pool, {
      seed: "t",
      division: "makushita",
    });
    for (const p of pairings) {
      const a = pool.find((r) => r.id === p.eastId)!;
      const b = pool.find((r) => r.id === p.westId)!;
      expect(a.heyaId).not.toBe(b.heyaId);
    }
  });
});

describe("no rematches outside ketteisen", () => {
  it("a faced pair is not re-paired on a later day", () => {
    const basho = MockFactory.createBasho({ day: 9 });
    // Seed a prior meeting into the card so the faced-set contains a↔b.
    basho.matches.push({
      id: "m-prior",
      day: 3,
      eastRikishiId: "a",
      westRikishiId: "b",
      result: { winnerRikishiId: "a", loserRikishiId: "b", kimarite: "yorikiri" },
    } as MatchSchedule);
    const pool = [mk("a", "heya-a"), mk("b", "heya-b")];
    for (const r of pool) basho.standings.set(r.id, { wins: 5, losses: 3 });
    const pairings = buildSwissTorikumi(basho, pool, { seed: "t", day: 9 });
    const rematch = pairings.filter(
      (p) => [p.eastId, p.westId].sort().join("|") === "a|b"
    );
    expect(rematch).toHaveLength(0);
  });
});

describe("published cards are locked", () => {
  it("a withdrawal keeps the posted future match for a fusenshō rather than re-pairing", () => {
    const world = MockFactory.createWorld({});
    const basho = MockFactory.createBasho({ day: 5 });
    const futureMatch: MatchSchedule = {
      id: "m-future",
      day: 8,
      eastRikishiId: "hurt",
      westRikishiId: "opp",
    } as MatchSchedule;
    basho.matches.push(futureMatch, {
      id: "m-future2",
      day: 8,
      eastRikishiId: "c",
      westRikishiId: "d",
    } as MatchSchedule);
    world.currentBasho = basho;
    world.rikishi.set("hurt", mk("hurt", "heya-h"));
    world.rikishi.set("opp", mk("opp", "heya-o"));
    world.rikishi.set("c", mk("c", "heya-c"));
    world.rikishi.set("d", mk("d", "heya-d"));

    const impact = reconcileFutureScheduleForWithdrawals(world, "hurt");
    const next = resolveImpacts(world, [impact]);
    const day8 = (next.currentBasho?.matches ?? []).filter(
      (m) => m.day === 8 && (m.eastRikishiId === "hurt" || m.westRikishiId === "hurt")
    );
    // The published day-8 match stays on the card — the opponent receives
    // a fusenshō when the day resolves; it is NOT re-paired.
    expect(day8).toHaveLength(1);
  });
});
