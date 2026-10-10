/**
 * Golden-master characterization for RivalryService — a 438-LOC const-object
 * targeted by Phase-2 per-method extraction (~6 prior tests). Pins StateImpact
 * digests and pure helpers across a seeded fixture matrix.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { RivalryService } from "@/engine/systems/narrative/RivalryService";
import { BardEngine } from "@/engine/bard/BardEngine";
import { makeMockWorld, mockRikishi } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { BoutResult } from "@/engine/types/basho";
import type { RivalriesState } from "@/constants/engine/rivalry";

/** Deterministically serialize a StateImpact for golden-master comparison. */
function impactDigest(impact: unknown): string {
  return JSON.stringify(
    impact,
    (_k, v) => (v instanceof Map ? { __map: [...v.entries()].sort() } : v),
    2
  );
}

function baseWorld(rivalriesState?: RivalriesState): WorldState {
  const east = mockRikishi("r-east", { shikona: "Eastho", heyaId: "heya-1" });
  const west = mockRikishi("r-west", { shikona: "Westzan", heyaId: "heya-2" });
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    activeRikishiIds: new Set([east.id, west.id]),
    rivalriesState,
    week: 7,
    year: 2026,
  });
}

function boutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "rb-bout",
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    upset: false,
    log: [],
    ...overrides,
  } as BoutResult;
}

describe("RivalryService — golden master", () => {
  beforeEach(() => BardEngine.resetCache());

  it("ensureRivalriesState — absent and present", () => {
    const fresh = baseWorld();
    const existing: RivalriesState = {
      version: "1.0.0",
      pairs: { x: { heat: 10 } },
    } as unknown as RivalriesState;
    expect({
      absent: RivalryService.ensureRivalriesState(fresh),
      present: RivalryService.ensureRivalriesState(baseWorld(existing)),
    }).toMatchSnapshot();
  });

  it("makeRivalryKey — canonical ordering", () => {
    expect([
      RivalryService.makeRivalryKey("b", "a"),
      RivalryService.makeRivalryKey("a", "b"),
      RivalryService.makeRivalryKey("same", "same"),
    ]).toMatchSnapshot();
  });

  it("createFreshPair — seeded fixture", () => {
    expect(RivalryService.createFreshPair("r-east", "r-west", baseWorld())).toMatchSnapshot();
  });

  it("onBoutResolved — new pair first bout", () => {
    expect(
      impactDigest(RivalryService.onBoutResolved(baseWorld(), { result: boutResult(), day: 5 }))
    ).toMatchSnapshot();
  });

  it("onBoutResolved — existing pair with history (kinboshi + upset variants)", () => {
    const key = RivalryService.makeRivalryKey("r-east", "r-west");
    const pair = RivalryService.createFreshPair("r-east", "r-west", baseWorld());
    pair.meetings = 6;
    pair.heat = 80;
    const world = baseWorld({ version: "1.0.0", pairs: { [key]: pair } });
    expect({
      normal: impactDigest(RivalryService.onBoutResolved(world, { result: boutResult(), day: 5 })),
      upset: impactDigest(
        RivalryService.onBoutResolved(world, { result: boutResult({ upset: true }), day: 5 })
      ),
      kinboshi: impactDigest(
        RivalryService.onBoutResolved(world, { result: boutResult({ isKinboshi: true }), day: 15 })
      ),
    }).toMatchSnapshot();
  });

  it("applyWeeklyDecay — empty + populated states", () => {
    const key = RivalryService.makeRivalryKey("r-east", "r-west");
    const hot = RivalryService.createFreshPair("r-east", "r-west", baseWorld());
    hot.heat = 90;
    hot.meetings = 4;
    const cold = RivalryService.createFreshPair("r-west", "r-east", baseWorld());
    cold.heat = 10;
    const state: RivalriesState = {
      version: "1.0.0",
      pairs: { [key]: hot, other: cold },
    } as RivalriesState;
    expect({
      empty: impactDigest(RivalryService.applyWeeklyDecay(baseWorld())),
      populated: impactDigest(RivalryService.applyWeeklyDecay(baseWorld(state))),
    }).toMatchSnapshot();
  });

  it("seedInitialRivalries — empty world + seeded world", () => {
    const populated = baseWorld();
    // seedInitialRivalries walks active roster — give it two ranked rikishi
    expect({
      empty: impactDigest(RivalryService.seedInitialRivalries(makeMockWorld())),
      populated: impactDigest(RivalryService.seedInitialRivalries(populated)),
    }).toMatchSnapshot();
  });

  it("maybeSeedSparringRivalry — gates + seeded path", () => {
    const world = baseWorld();
    expect({
      nonFriction: impactDigest(
        RivalryService.maybeSeedSparringRivalry(world, "r-east", "r-west", "neutral", 20)
      ),
      tooEarly: impactDigest(
        RivalryService.maybeSeedSparringRivalry(world, "r-east", "r-west", "friction", 5)
      ),
      seededOrRngGated_12w: impactDigest(
        RivalryService.maybeSeedSparringRivalry(world, "r-east", "r-west", "friction", 12)
      ),
      seededOrRngGated_30w: impactDigest(
        RivalryService.maybeSeedSparringRivalry(world, "r-east", "r-west", "friction", 30)
      ),
      missingRikishi: impactDigest(
        RivalryService.maybeSeedSparringRivalry(world, "ghost-a", "ghost-b", "friction", 20)
      ),
    }).toMatchSnapshot();
  });
});
