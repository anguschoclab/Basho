import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule, BashoState } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

/**
 * V5-B09 regression: player bout tactics chosen in the UI are stored in
 * reducer UI state only (`state.boutTactics`) and never reach the worker.
 *
 * Post-fix contract being pinned here: tactics must live in WorldState
 * (world.boutTactics: Record<boutId, BoutTactic>) so the authoritative
 * worker path can apply them during bout resolution. The phase resolves the
 * day's bouts via `simulateBoutsForDay` (batch, world.ts), which forwards the
 * stored tactic to `resolveBout` — spied here at the resolveBout boundary.
 */

const resolveSpy = vi.fn();

vi.mock("@/engine/bout/boutResolver", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engine/bout/boutResolver")>();
  return {
    ...actual,
    resolveBout: (...args: Parameters<typeof actual.resolveBout>) => {
      resolveSpy(...args);
      return actual.resolveBout(...args);
    },
  };
});

import { phase01_basho_bouts } from "@/engine/tick/phases/phase01_basho_bouts";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

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

function makeWorld(): WorldState {
  const east = makeRikishi("east");
  const west = makeRikishi("west", { side: "west", heyaId: "npc-heya" });
  const matches: MatchSchedule[] = [
    { boutId: "player-bout", day: 1, eastRikishiId: "east", westRikishiId: "west" },
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
      ["test-heya", MockFactory.createHeya("test-heya", { rikishiIds: ["east"] })],
      ["npc-heya", MockFactory.createHeya("npc-heya", { rikishiIds: ["west"] })],
    ]),
    playerHeyaId: "test-heya",
    currentBasho: basho,
    cyclePhase: "active_basho",
    rivalriesState: { pairs: {}, version: "1.0.0" },
  });
}

describe("phase01_basho_bouts player tactics (V5-B09)", () => {
  beforeEach(() => resolveSpy.mockClear());
  afterEach(() => resolveSpy.mockClear());

  it("applies a tactic stored in world.boutTactics for the bout's id", () => {
    const world = makeWorld();
    // Post-fix contract: tactics chosen in the UI are persisted on the world
    // (surviving save/load and the worker boundary), keyed by boutId.
    (world as unknown as Record<string, unknown>).boutTactics = {
      "player-bout": "HENKA",
    };

    const impact = phase01_basho_bouts(world);
    resolveImpacts(world, [impact]);

    // resolveBout(boutContext, east, west, basho, tactic, world) — arg 4 is the tactic
    const callWithTactic = resolveSpy.mock.calls.find((c) => c[4] === "HENKA");
    expect(
      callWithTactic,
      "phase01_basho_bouts must forward the stored tactic to resolveBout"
    ).toBeDefined();
  });

  it("resolves with no tactic when none is stored", () => {
    const world = makeWorld();
    const impact = phase01_basho_bouts(world);
    resolveImpacts(world, [impact]);

    // Every call should have undefined/absent tactic arg
    for (const call of resolveSpy.mock.calls) {
      expect(call[4] === undefined || call[4] === null).toBe(true);
    }
    expect(resolveSpy.mock.calls.length).toBeGreaterThan(0);
  });
});
