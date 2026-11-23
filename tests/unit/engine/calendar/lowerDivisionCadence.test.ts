import { describe, it, expect } from "vitest";
import { scheduleAllDivisionsDay } from "@/engine/calendar/schedule";
import { mockRikishi, makeMockWorld, makeMockHeya, makeMockBasho } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { Division } from "@/engine/types/banzuke";

/**
 * Regression — lower divisions must fight exactly their 7 odd days.
 *
 * `pairCrossDivisionLeftovers` swept `activeDivisionRoster` for EVERY
 * division each day — including lower divisions whose card didn't run.
 * On even days the entire Ms/Sd/Jd/Jk roster landed in `leftovers` and
 * got paired as "cross-division leftovers", giving lower-division
 * rikishi ~14 bouts per basho instead of 7. Records ran hot: KK flood
 * in the Ms promotion zone drove `Ms→J` to 17-26/basho (real ~2-6).
 *
 * Legitimate juryo→makushita callups (`crossDivisionCallupId`) still
 * place a lower-division rikishi on an even-day juryo card — those are
 * the designed exception, not a violation.
 */
function buildMixedRosterWorld(): WorldState {
  const world = makeMockWorld({
    seed: "lower-cadence-seed",
    cyclePhase: "pre_basho",
    currentBashoName: "hatsu",
  });
  for (let h = 1; h <= 6; h++) {
    world.heyas.set(`heya-${h}`, makeMockHeya(`heya-${h}`));
  }
  const add = (id: string, division: Division, rank: string, i: number) => {
    const r: Rikishi = mockRikishi(id, {
      heyaId: `heya-${(i % 6) + 1}`,
      division,
      rank: rank as Rikishi["rank"],
      rankNumber: Math.ceil(i / 2),
      side: i % 2 === 1 ? "east" : "west",
    });
    world.rikishi.set(id, r);
    world.activeRikishiIds.add(id);
  };
  for (let i = 1; i <= 8; i++) add(`m-${i}`, "makuuchi", "maegashira", i);
  for (let i = 1; i <= 8; i++) add(`j-${i}`, "juryo", "juryo", i);
  for (let i = 1; i <= 8; i++) add(`ms-${i}`, "makushita", "makushita", i);
  for (let i = 1; i <= 8; i++) add(`sd-${i}`, "sandanme", "sandanme", i);
  for (let i = 1; i <= 8; i++) add(`jd-${i}`, "jonidan", "jonidan", i);
  for (let i = 1; i <= 8; i++) add(`jk-${i}`, "jonokuchi", "jonokuchi", i);
  return world;
}

const LOWER = new Set(["makushita", "sandanme", "jonidan", "jonokuchi"]);

function boutInvolvesLower(world: WorldState, m: { eastRikishiId: string; westRikishiId: string }) {
  const a = world.rikishi.get(m.eastRikishiId);
  const b = world.rikishi.get(m.westRikishiId);
  return LOWER.has(a?.division ?? "") || LOWER.has(b?.division ?? "");
}

describe("lower-division 7-bout cadence", () => {
  it("schedules no same-division lower bouts on even days (callups only)", () => {
    const world = buildMixedRosterWorld();
    const basho = makeMockBasho({ day: 2 });
    const { scheduled } = scheduleAllDivisionsDay({ world, basho, day: 2, seed: "s" });

    for (const m of scheduled.filter((m) => boutInvolvesLower(world, m))) {
      // Every lower-division participant on an off-day must ride a higher
      // division's card as a tagged callup — never an in-division leftover
      // pairing. Two Ms callups MAY face each other on the juryo card; the
      // tag marks it legitimate.
      expect(
        m.crossDivisionCallupId,
        `lower-division bout ${m.boutId} on day 2 lacks callup tag`
      ).toBeDefined();
    }
  });

  it("lower-division rikishi accumulate at most 7 home-division bouts over 15 days", () => {
    const world = buildMixedRosterWorld();
    const basho = makeMockBasho({ day: 1 });
    const boutsPer = new Map<string, number>();
    for (let day = 1; day <= 15; day++) {
      const { scheduled, impact } = scheduleAllDivisionsDay({
        world,
        basho: { ...basho, day, matches: basho.matches },
        day,
        seed: "s",
      });
      basho.matches.push(...scheduled);
      void impact;
      for (const m of scheduled) {
        for (const id of [m.eastRikishiId, m.westRikishiId]) {
          // Callup bouts ride a higher division's card — they don't consume
          // the rikishi's own-division 7-bout allowance.
          if (m.crossDivisionCallupId === id) continue;
          boutsPer.set(id, (boutsPer.get(id) ?? 0) + 1);
        }
      }
    }
    for (const [id, n] of boutsPer) {
      const div = world.rikishi.get(id)?.division;
      if (div && LOWER.has(div)) {
        expect(n, `${id} fought ${n} home-division bouts — division cap is 7`).toBeLessThanOrEqual(7);
      }
    }
  });
});
