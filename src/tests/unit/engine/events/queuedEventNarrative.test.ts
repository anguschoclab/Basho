import { describe, it, expect } from "vitest";
import { simulateBoutForToday } from "@/engine/world";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BashoState } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi",
    rank: "maegashira",
    rankNumber: 1,
    side: "east",
    heyaId: "test-heya",
    stats: {
      power: 60,
      speed: 60,
      technique: 60,
      weight: 140,
      stamina: 60,
      mental: 60,
      adaptability: 60,
      balance: 60,
      aggression: 60,
      experience: 10,
    },
    ...overrides,
  });
}

function makeBashoWorld(): WorldState {
  const east = makeRikishi("east");
  const west = makeRikishi("west", { side: "west" });
  const matches: MatchSchedule[] = [
    { boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west" },
  ];
  const basho: BashoState = {
    id: "test-basho",
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 1,
    matches,
    standings: new Map([
      ["east", { wins: 0, losses: 0 }],
      ["west", { wins: 0, losses: 0 }],
    ]),
    isActive: true,
  };
  return MockFactory.createWorld({
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([
      ["test-heya", MockFactory.createHeya("test-heya", { rikishiIds: ["east", "west"] })],
    ]),
    currentBasho: basho,
    cyclePhase: "active_basho",
    events: { version: "1.0.0", log: [], dedupe: {} },
    rivalriesState: { pairs: {}, version: "1.0.0" },
  });
}

/**
 * V5-B05 regression: events queued via ImpactBuilder.logEvent reach the
 * engine event log with EMPTY title/summary, because ImpactResolver reads
 * `data.title`/`data.summary` verbatim and producers (e.g. boutResultApplier)
 * only populate NarrativeContext fields (winner, loser, kimarite…).
 *
 * These assertions encode the REQUIRED post-fix behavior: every queued
 * event that lands in world.events.log must carry a human-readable
 * title and summary so digests/feed never render blank rows.
 */
describe("queued event narrative text (V5-B05)", () => {
  it("BOUT_RESOLVED events persisted via resolveImpacts carry a non-empty title", () => {
    const world = makeBashoWorld();
    const { world: next } = simulateBoutForToday(world, 0);

    const boutEvents = next.events.log.filter((e) => e.type === "BOUT_RESOLVED");
    expect(boutEvents.length).toBeGreaterThan(0);
    for (const ev of boutEvents) {
      expect(ev.title, `BOUT_RESOLVED event ${ev.id} must have a title`).not.toBe("");
    }
  });

  it("BOUT_RESOLVED events persisted via resolveImpacts carry a non-empty summary", () => {
    const world = makeBashoWorld();
    const { world: next } = simulateBoutForToday(world, 0);

    const boutEvents = next.events.log.filter((e) => e.type === "BOUT_RESOLVED");
    expect(boutEvents.length).toBeGreaterThan(0);
    for (const ev of boutEvents) {
      expect(ev.summary, `BOUT_RESOLVED event ${ev.id} must have a summary`).not.toBe("");
    }
  });

  it("any event queued through ImpactBuilder.logEvent lands with resolved title/summary", () => {
    const world = makeBashoWorld();
    const impact = createImpactBuilder("test")
      .logEvent("PHASE_TRANSITION", "misc", { from: "interim", to: "pre_basho" })
      .build();
    const next = resolveImpacts(world, [impact]);

    const ev = next.events.log.find((e) => e.type === "PHASE_TRANSITION");
    expect(ev).toBeDefined();
    expect(ev!.title).not.toBe("");
    expect(ev!.summary).not.toBe("");
  });
});
