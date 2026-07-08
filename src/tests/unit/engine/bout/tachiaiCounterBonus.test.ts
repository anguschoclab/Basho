import { describe, it, expect } from "vitest";
import { SeededRNG } from "@/engine/rng";
import { resolveTachiaiV2 } from "@/engine/bout/physics/tachiai";
import { initEngineStateV2 } from "@/engine/bout/physics/initState";
import { COUNTER_TACTIC_BONUS } from "@/engine/types/combat";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { EngineStateV2 } from "@/engine/types/combat-spatial";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutLogEntry } from "@/engine/types/basho";
import { mockRikishi } from "../utils";

function makeBoutContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    id: "bout-counter-test",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...overrides,
  };
}

function runTachiai(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi
): { st: EngineStateV2; boutLog: BoutLogEntry[] } {
  const st = initEngineStateV2(bout, east, west);
  const boutLog: BoutLogEntry[] = [];
  const rng = new SeededRNG("counter-tactic-test");
  resolveTachiaiV2(rng, bout, east, west, st, boutLog);
  return { st, boutLog };
}

function findCounterLog(boutLog: BoutLogEntry[]): BoutLogEntry | undefined {
  return boutLog.find(
    (e) => (e.data as Record<string, unknown>).event === "counter_tactic_advantage"
  );
}

describe("resolveTachiaiV2 — counter-tactic bonus integration", () => {
  it("applies counter bonus to player east side when OSHI_THRUST counters belt-dominant opponent", () => {
    const east = mockRikishi("r-east", { power: 50, speed: 50 });
    const west = mockRikishi("r-west", { power: 50, speed: 50 });
    west.combatProfile = {
      archetype: "yotsu",
      familyPreferences: { push: 10, belt: 70, trick: 10, speed: 10 },
      preferredGrip: "mig",
      preferredGripDepth: "deep",
      statModifiers: {},
    };
    const bout = makeBoutContext({
      playerSide: "east",
      playerTactic: "OSHI_THRUST",
    });

    const { boutLog } = runTachiai(bout, east, west);
    const counterEntry = findCounterLog(boutLog);
    expect(counterEntry).toBeDefined();
    expect((counterEntry!.data as Record<string, unknown>).counterBonus).toBe(COUNTER_TACTIC_BONUS);
  });

  it("applies counter bonus to player west side when OSHI_THRUST counters belt-dominant opponent", () => {
    const east = mockRikishi("r-east", { power: 50, speed: 50 });
    east.combatProfile = {
      archetype: "yotsu",
      familyPreferences: { push: 10, belt: 70, trick: 10, speed: 10 },
      preferredGrip: "mig",
      preferredGripDepth: "deep",
      statModifiers: {},
    };
    const west = mockRikishi("r-west", { power: 50, speed: 50 });
    const bout = makeBoutContext({
      playerSide: "west",
      playerTactic: "OSHI_THRUST",
    });

    const { boutLog } = runTachiai(bout, east, west);
    const counterEntry = findCounterLog(boutLog);
    expect(counterEntry).toBeDefined();
    expect((counterEntry!.data as Record<string, unknown>).counterBonus).toBe(COUNTER_TACTIC_BONUS);
  });

  it("does NOT apply counter bonus when playerTactic is STANDARD", () => {
    const east = mockRikishi("r-east", { power: 50, speed: 50 });
    const west = mockRikishi("r-west", { power: 50, speed: 50 });
    west.combatProfile = {
      archetype: "yotsu",
      familyPreferences: { push: 10, belt: 70, trick: 10, speed: 10 },
      preferredGrip: "mig",
      preferredGripDepth: "deep",
      statModifiers: {},
    };
    const bout = makeBoutContext({
      playerSide: "east",
      playerTactic: "STANDARD",
    });

    const { boutLog } = runTachiai(bout, east, west);
    const counterEntry = findCounterLog(boutLog);
    expect(counterEntry).toBeUndefined();
  });

  it("does NOT apply counter bonus when opponent has no combatProfile", () => {
    const east = mockRikishi("r-east", { power: 50, speed: 50 });
    const west = mockRikishi("r-west", { power: 50, speed: 50 });
    west.combatProfile = undefined;
    const bout = makeBoutContext({
      playerSide: "east",
      playerTactic: "OSHI_THRUST",
    });

    const { boutLog } = runTachiai(bout, east, west);
    const counterEntry = findCounterLog(boutLog);
    expect(counterEntry).toBeUndefined();
  });

  it("does NOT apply counter bonus when tactic does not counter opponent family", () => {
    const east = mockRikishi("r-east", { power: 50, speed: 50 });
    const west = mockRikishi("r-west", { power: 50, speed: 50 });
    // push-dominant opponent; YOTSU_BELT (belt) does NOT counter push
    west.combatProfile = {
      archetype: "oshi",
      familyPreferences: { push: 70, belt: 10, trick: 10, speed: 10 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: {},
    };
    const bout = makeBoutContext({
      playerSide: "east",
      playerTactic: "YOTSU_BELT",
    });

    const { boutLog } = runTachiai(bout, east, west);
    const counterEntry = findCounterLog(boutLog);
    expect(counterEntry).toBeUndefined();
  });

  it("logs exactly COUNTER_TACTIC_BONUS (5) as the counterBonus value", () => {
    const east = mockRikishi("r-east", { power: 50, speed: 50 });
    const west = mockRikishi("r-west", { power: 50, speed: 50 });
    west.combatProfile = {
      archetype: "yotsu",
      familyPreferences: { push: 10, belt: 70, trick: 10, speed: 10 },
      preferredGrip: "mig",
      preferredGripDepth: "deep",
      statModifiers: {},
    };
    const bout = makeBoutContext({
      playerSide: "east",
      playerTactic: "OSHI_THRUST",
    });

    const { boutLog } = runTachiai(bout, east, west);
    const counterEntry = findCounterLog(boutLog);
    expect(counterEntry).toBeDefined();
    expect((counterEntry!.data as Record<string, unknown>).counterBonus).toBe(5);
  });

  it("sets tachiaiWinner to player side when counter bonus is decisive", () => {
    // Equal stats; counter bonus of +5 vs ±4 jitter should give east >50% win chance.
    // Run multiple iterations to confirm east wins the tachiai at least once.
    const east = mockRikishi("r-east", { power: 50, speed: 50, aggression: 50 });
    const west = mockRikishi("r-west", { power: 50, speed: 50, aggression: 50 });
    west.combatProfile = {
      archetype: "yotsu",
      familyPreferences: { push: 10, belt: 70, trick: 10, speed: 10 },
      preferredGrip: "mig",
      preferredGripDepth: "deep",
      statModifiers: {},
    };
    const bout = makeBoutContext({
      playerSide: "east",
      playerTactic: "OSHI_THRUST",
    });

    let eastTachiaiWins = 0;
    for (let i = 0; i < 50; i++) {
      const { st } = runTachiai(bout, east, west);
      if (st.tachiaiWinner === "east") eastTachiaiWins++;
    }
    // With +5 bonus vs ±4 jitter, east should win the tachiai majority of the time
    expect(eastTachiaiWins).toBeGreaterThan(25);
  });
});
