import { describe, it, expect } from "vitest";
import { RivalryService } from "@/engine/systems/narrative/RivalryService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { RivalriesState } from "@/constants/engine/rivalry";
import {
  SPARRING_RIVALRY_WEEKS_THRESHOLD,
  SPARRING_INITIAL_HEAT_MIN,
  SPARRING_INITIAL_HEAT_MAX,
} from "@/constants/engine/rivalry";

function makeWorld(
  aId: string,
  bId: string,
  overrides: Partial<WorldState> = {}
): WorldState {
  const a = mockRikishi(aId, { heyaId: "h1" });
  const b = mockRikishi(bId, { heyaId: "h1" });
  const heya = makeMockHeya("h1", { rikishiIds: [aId, bId] });
  const world = makeMockWorld({
    rikishi: new Map([
      [a.id, a],
      [b.id, b],
    ]),
    ...overrides,
  });
  world.heyas.set("h1", heya);
  return world as WorldState;
}

function makeRivalriesState(
  pairs: Record<string, unknown> = {}
): RivalriesState {
  return {
    version: "1.0.0",
    pairs: pairs as RivalriesState["pairs"],
  };
}

describe("RivalryService.maybeSeedSparringRivalry", () => {
  it("returns empty impact for non-friction chemistry (neutral)", () => {
    const world = makeWorld("r1", "r2");
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "r2",
      "neutral",
      20
    );
    expect(impact.worldFields?.rivalriesState).toBeUndefined();
  });

  it("returns empty impact for non-friction chemistry (rut)", () => {
    const world = makeWorld("r1", "r2");
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "r2",
      "rut",
      20
    );
    expect(impact.worldFields?.rivalriesState).toBeUndefined();
  });

  it("returns empty impact for weeksActive below threshold", () => {
    const world = makeWorld("r1", "r2");
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "r2",
      "friction",
      SPARRING_RIVALRY_WEEKS_THRESHOLD - 1
    );
    expect(impact.worldFields?.rivalriesState).toBeUndefined();
  });

  it("returns empty impact if rivalry already exists", () => {
    const key = RivalryService.makeRivalryKey("r1", "r2");
    const existingState = makeRivalriesState({
      [key]: {
        key,
        aId: "r1",
        bId: "r2",
        heat: 50,
        meetings: 5,
        lastMetWeek: 10,
        aWins: 3,
        bWins: 2,
        closeness: 50,
        spite: 10,
        tone: "grudge",
        triggers: {},
        sameHeya: true,
      },
    });
    const world = makeWorld("r1", "r2", {
      rivalriesState: existingState,
    });
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "r2",
      "friction",
      20
    );
    expect(impact.worldFields?.rivalriesState).toBeUndefined();
  });

  it("returns empty impact if either rikishi not found", () => {
    const world = makeWorld("r1", "r2");
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "nonexistent",
      "friction",
      20
    );
    expect(impact.worldFields?.rivalriesState).toBeUndefined();
  });

  it("seeds rivalry with friction chemistry at threshold weeks (deterministic seed)", () => {
    const world = makeWorld("r1", "r2", { seed: "test-seed-0" });
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "r2",
      "friction",
      SPARRING_RIVALRY_WEEKS_THRESHOLD
    );

    const updatedWorld = resolveImpacts(world, [impact]);
    const state = updatedWorld.rivalriesState;
    expect(state).toBeDefined();
    const key = RivalryService.makeRivalryKey("r1", "r2");
    const pair = state!.pairs[key];
    expect(pair).toBeDefined();
    expect(pair.heat).toBeGreaterThanOrEqual(SPARRING_INITIAL_HEAT_MIN);
    expect(pair.heat).toBeLessThanOrEqual(SPARRING_INITIAL_HEAT_MAX);
  });

  it("seeded tone is one of friction tones (grudge, bad_blood, public_hype)", () => {
    const world = makeWorld("r1", "r2", { seed: "test-seed-0" });
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "r2",
      "friction",
      SPARRING_RIVALRY_WEEKS_THRESHOLD
    );

    const updatedWorld = resolveImpacts(world, [impact]);
    const key = RivalryService.makeRivalryKey("r1", "r2");
    const pair = updatedWorld.rivalriesState!.pairs[key];
    expect(pair).toBeDefined();
    expect(["grudge", "bad_blood", "public_hype"]).toContain(pair.tone);
  });

  it("triggers.sparring is set to weeksActive", () => {
    const world = makeWorld("r1", "r2", { seed: "test-seed-0" });
    const weeksActive = 15;
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "r2",
      "friction",
      weeksActive
    );

    const updatedWorld = resolveImpacts(world, [impact]);
    const key = RivalryService.makeRivalryKey("r1", "r2");
    const pair = updatedWorld.rivalriesState!.pairs[key];
    expect(pair.triggers.sparring).toBe(weeksActive);
  });

  it("logs SPARRING_RIVALRY_SEEDED event", () => {
    const world = makeWorld("r1", "r2", { seed: "test-seed-0" });
    const impact = RivalryService.maybeSeedSparringRivalry(
      world,
      "r1",
      "r2",
      "friction",
      SPARRING_RIVALRY_WEEKS_THRESHOLD
    );

    expect(impact.events).toBeDefined();
    expect(impact.events!.length).toBeGreaterThan(0);
    const event = impact.events!.find(
      (e) => e.type === "SPARRING_RIVALRY_SEEDED"
    );
    expect(event).toBeDefined();
    expect(event!.data.chemistry).toBe("friction");
    expect(event!.data.weeksActive).toBe(SPARRING_RIVALRY_WEEKS_THRESHOLD);
  });

  it("does not seed for all non-friction chemistries across multiple seeds", () => {
    for (const chemistry of ["neutral", "rut"] as const) {
      for (let seedIndex = 0; seedIndex < 10; seedIndex++) {
        const world = makeWorld("r1", "r2", { seed: `test-seed-${seedIndex}` });
        const impact = RivalryService.maybeSeedSparringRivalry(
          world,
          "r1",
          "r2",
          chemistry,
          20
        );
        expect(impact.worldFields?.rivalriesState).toBeUndefined();
      }
    }
  });
});
