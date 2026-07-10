/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { buildPerceptionSnapshot } from "@/engine/perception";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { HEAT_BLAZING_THRESHOLD, HEAT_HOT_THRESHOLD, HEAT_WARM_THRESHOLD } from "@/constants/engine/perception";
import type { RivalriesState, RivalryPairState } from "@/constants/engine/rivalry";

function makePair(aId: string, bId: string, heat: number): RivalryPairState {
  return {
    key: `${aId}|${bId}`,
    aId,
    bId,
    heat,
    meetings: 1,
    lastMetWeek: 1,
    aWins: 0,
    bWins: 0,
    closeness: 50,
    spite: 50,
    tone: "neutral" as any,
    triggers: {},
    sameHeya: false,
  };
}

describe("bandRivalry (via buildPerceptionSnapshot)", () => {
  it("returns dormant when no rivalriesState exists", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1"];
    const world = MockFactory.createWorld();
    world.heyas.set("heya1", heya);
    world.rivalriesState = undefined;

    const snap = buildPerceptionSnapshot(world, "heya1");
    expect(snap.rivalryPressureBand).toBe("dormant");
  });

  it("returns dormant when heya has no rikishi", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = [];
    const world = MockFactory.createWorld();
    world.heyas.set("heya1", heya);
    world.rivalriesState = {
      version: "1.0.0",
      pairs: { "rA|rB": makePair("rA", "rB", 90) },
    } as RivalriesState;

    const snap = buildPerceptionSnapshot(world, "heya1");
    expect(snap.rivalryPressureBand).toBe("dormant");
  });

  it("returns fierce when heat >= HEAT_BLAZING_THRESHOLD", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1"];
    const world = MockFactory.createWorld();
    world.heyas.set("heya1", heya);
    world.rivalriesState = {
      version: "1.0.0",
      pairs: { "r1|r2": makePair("r1", "r2", HEAT_BLAZING_THRESHOLD) },
    } as RivalriesState;

    const snap = buildPerceptionSnapshot(world, "heya1");
    expect(snap.rivalryPressureBand).toBe("fierce");
  });

  it("returns heated when heat >= HEAT_HOT_THRESHOLD but < HEAT_BLAZING_THRESHOLD", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1"];
    const world = MockFactory.createWorld();
    world.heyas.set("heya1", heya);
    world.rivalriesState = {
      version: "1.0.0",
      pairs: { "r1|r2": makePair("r1", "r2", HEAT_HOT_THRESHOLD) },
    } as RivalriesState;

    const snap = buildPerceptionSnapshot(world, "heya1");
    expect(snap.rivalryPressureBand).toBe("heated");
  });

  it("returns simmering when heat >= HEAT_WARM_THRESHOLD but < HEAT_HOT_THRESHOLD", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1"];
    const world = MockFactory.createWorld();
    world.heyas.set("heya1", heya);
    world.rivalriesState = {
      version: "1.0.0",
      pairs: { "r1|r2": makePair("r1", "r2", HEAT_WARM_THRESHOLD) },
    } as RivalriesState;

    const snap = buildPerceptionSnapshot(world, "heya1");
    expect(snap.rivalryPressureBand).toBe("simmering");
  });

  it("returns dormant when heat below all thresholds", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1"];
    const world = MockFactory.createWorld();
    world.heyas.set("heya1", heya);
    world.rivalriesState = {
      version: "1.0.0",
      pairs: { "r1|r2": makePair("r1", "r2", HEAT_WARM_THRESHOLD - 1) },
    } as RivalriesState;

    const snap = buildPerceptionSnapshot(world, "heya1");
    expect(snap.rivalryPressureBand).toBe("dormant");
  });

  it("only considers pairs involving heya's rikishi", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1"];
    const world = MockFactory.createWorld();
    world.heyas.set("heya1", heya);
    world.rivalriesState = {
      version: "1.0.0",
      pairs: {
        "r2|r3": makePair("r2", "r3", 90),
        "r1|r4": makePair("r1", "r4", 10),
      },
    } as RivalriesState;

    const snap = buildPerceptionSnapshot(world, "heya1");
    expect(snap.rivalryPressureBand).toBe("dormant");
  });

  it("handles missing rivalriesState.pairs", () => {
    const heya = MockFactory.createHeya("heya1");
    heya.rikishiIds = ["r1"];
    const world = MockFactory.createWorld();
    world.heyas.set("heya1", heya);
    world.rivalriesState = { version: "1.0.0", pairs: undefined as any };

    const snap = buildPerceptionSnapshot(world, "heya1");
    expect(snap.rivalryPressureBand).toBe("dormant");
  });
});
