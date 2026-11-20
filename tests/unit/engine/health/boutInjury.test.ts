import { describe, it, expect } from "vitest";
import { onBoutResolvedInjury } from "@/engine/health/InjuryService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BoutResult, MatchSchedule } from "@/engine/types/basho";

/**
 * Bout injury pipeline (W A):
 * - `result.inBoutInjury` (produced by edge-crisis physics) must actually
 *   injure the rikishi — it had no consumer and was narrative-only.
 * - A rikishi who ENTERED the bout injured takes an aggravation roll
 *   instead of being silently skipped — "fighting hurt" has teeth.
 * - The injured-loser early return must not kill the winner's roll.
 */
function result(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "inj-1",
    day: 5,
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 10,
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: {} }],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  };
}

const match = {
  boutId: "inj-1",
  day: 5,
  eastRikishiId: "r-east",
  westRikishiId: "r-west",
} as MatchSchedule;

function hurt(weeks = 2) {
  return MockFactory.createRikishi("r-hurt", {
    injured: true,
    injuryWeeksRemaining: weeks,
    injuryStatus: {
      type: "sprain",
      isInjured: true,
      severity: "moderate",
      location: "ankle",
      weeksRemaining: weeks,
      weeksToHeal: weeks,
    },
  });
}

describe("onBoutResolvedInjury — inBoutInjury consumer", () => {
  it("applies a physics-produced in-bout injury to the named rikishi", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = MockFactory.createRikishi("r-west");
    const world = MockFactory.createWorld({
      rikishi: new Map([
        [east.id, east],
        [west.id, west],
      ]),
    });
    const res = result({
      inBoutInjury: {
        rikishiId: west.id,
        area: "knee",
        severity: "moderate",
        triggerEvent: "edge_crisis",
      },
    });

    const impact = onBoutResolvedInjury(world, { match, result: res, east, west });
    const upd = impact.entities?.rikishiUpdates?.get(west.id);

    expect(upd?.injured).toBe(true);
    expect(upd?.injuryStatus?.severity).toBe("moderate");
    expect(upd?.injuryStatus?.location).toBe("knee");
    expect(upd?.injuryWeeksRemaining).toBeGreaterThan(0);
  });

  it("an in-bout injury on an already-injured rikishi aggravates", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = { ...hurt(2), id: "r-west" } as ReturnType<typeof MockFactory.createRikishi>;
    const world = MockFactory.createWorld({
      rikishi: new Map([
        [east.id, east],
        [west.id, west],
      ]),
    });
    const res = result({
      inBoutInjury: {
        rikishiId: west.id,
        area: "knee",
        severity: "serious",
        triggerEvent: "edge_crisis",
      },
    });

    const impact = onBoutResolvedInjury(world, { match, result: res, east, west });
    const upd = impact.entities?.rikishiUpdates?.get(west.id);

    expect(upd?.injured).toBe(true);
    // Aggravation lengthens recovery beyond the pre-existing 2 weeks.
    expect(upd?.injuryWeeksRemaining).toBeGreaterThan(2);
  });
});

describe("onBoutResolvedInjury — competing-injured aggravation", () => {
  it("an injured loser takes an aggravation roll across enough days", () => {
    const east = MockFactory.createRikishi("r-east");
    const west = hurt(2);
    // Vary dayIndexGlobal to vary the deterministic aggravation stream.
    let aggravated = 0;
    for (let day = 0; day < 300; day++) {
      const world = MockFactory.createWorld({
        dayIndexGlobal: day,
        rikishi: new Map([
          [east.id, east],
          [west.id, { ...west, injuryWeeksRemaining: 2 }],
        ]),
      });
      const impact = onBoutResolvedInjury(world, {
        match: { ...match, day },
        result: result(),
        east,
        west,
      });
      const upd = impact.entities?.rikishiUpdates?.get(west.id);
      if ((upd?.injuryWeeksRemaining ?? 2) > 2) aggravated++;
    }
    // Moderate-severity aggravation base ~12% — wide deterministic bounds.
    expect(aggravated).toBeGreaterThan(0);
    expect(aggravated).toBeLessThan(150);
  });

  it("an injured loser no longer starves the winner's roll", () => {
    const west = hurt(2);
    const east = MockFactory.createRikishi("r-east");
    // Winner carries an elevated risk override — before the fix, the
    // `loser.injured` early-return made this path unreachable.
    let winnerHits = 0;
    for (let day = 0; day < 300; day++) {
      const world = MockFactory.createWorld({
        dayIndexGlobal: day,
        rikishi: new Map([
          [east.id, east],
          [west.id, west],
        ]),
      });
      const impact = onBoutResolvedInjury(world, {
        match: { ...match, day },
        result: result(),
        east,
        west,
        winnerInjuryRiskMultiplier: 4.0,
      });
      const upd = impact.entities?.rikishiUpdates?.get(east.id);
      if (upd?.injured) winnerHits++;
    }
    expect(winnerHits).toBeGreaterThan(0);
  });
});
