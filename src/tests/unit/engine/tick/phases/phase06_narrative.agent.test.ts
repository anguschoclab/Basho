import { describe, it, expect, beforeEach, vi } from "vitest";
import { phase06_narrative } from "@/engine/tick/phases/phase06_narrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";
import { mockRikishi, makeMockHeya } from "../../utils";
import type { BashoResult } from "@/engine/types/basho";

function makeOyakata(overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id: "oyakata-1",
    heyaId: "heya-1",
    name: "Test Oyakata",
    shikona: "TestShikona",
    age: 55,
    archetype: "traditional",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    yearsInCharge: 10,
    ...overrides,
  } as Oyakata;
}

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  const rikishi = new Map([
    [
      "r1",
      mockRikishi("r1", {
        shikona: "Champion",
        heyaId: "heya-1",
        division: "makuuchi",
        rank: "yokozuna",
      }),
    ],
    [
      "r2",
      mockRikishi("r2", {
        shikona: "Veteran",
        heyaId: "heya-1",
        division: "makuuchi",
        rank: "ozeki",
      }),
    ],
  ]);
  const heyas = new Map([
    [
      "heya-1",
      makeMockHeya("heya-1", {
        name: "Test Heya",
        rikishiIds: ["r1", "r2"],
        oyakataId: "oyakata-1",
      }),
    ],
  ]);
  const oyakata = new Map([["oyakata-1", makeOyakata({ heyaId: "heya-1" })]]);
  return {
    playerHeyaId: "heya-1",
    heyas,
    rikishi,
    oyakata,
    activeRikishiIds: new Set(["r1", "r2"]),
    cyclePhase: "post_basho",
    week: 10,
    seed: "test-seed-agent",
    events: { version: "1.0.0", log: [], dedupe: {} },
    history: [],
    transientContext: {
      deltas: {
        revenue: 1000,
        expenses: 500,
        injuriesSustained: [],
        statChanges: {},
      },
    },
    ...overrides,
  } as unknown as WorldState;
}

function makeBashoResult(overrides: Partial<BashoResult> = {}): BashoResult {
  return {
    bashoName: "hatsu",
    bashoNumber: 1,
    year: 2025,
    yusho: "r1",
    junYusho: [],
    standings: new Map(),
    finalWorld: {} as WorldState,
    demotions: [],
    ...overrides,
  } as BashoResult;
}

describe("phase06_narrative — narrative agent surfacing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BardEngine.resetCache();
  });

  it("yusho in last basho → AWARD_CONFERRED event logged", () => {
    const world = makeWorld({
      history: [makeBashoResult({ yusho: "r1" })],
      cyclePhase: "post_basho",
    });
    const impact = phase06_narrative(world);
    const narrativeEvents = impact.events?.filter((e) => e.category === "narrative") ?? [];
    expect(narrativeEvents.length).toBeGreaterThan(0);
    const awardEvent = narrativeEvents.find((e) => e.type === "AWARD_CONFERRED");
    expect(awardEvent).toBeDefined();
  });

  it("kinboshi (shukunsho) in last basho → event logged", () => {
    const world = makeWorld({
      history: [makeBashoResult({ yusho: "r-other", shukunsho: "r1" })],
      cyclePhase: "post_basho",
    });
    const impact = phase06_narrative(world);
    const narrativeEvents = impact.events?.filter((e) => e.category === "narrative") ?? [];
    expect(narrativeEvents.length).toBeGreaterThan(0);
  });

  it("retirement event in log → RETIREMENT_ANNOUNCED narrative event", () => {
    const world = makeWorld({
      history: [],
      cyclePhase: "interim",
      events: {
        version: "1.0.0",
        log: [
          {
            type: "RETIREMENT_ANNOUNCED",
            category: "career",
            data: {},
            week: 5,
          },
        ],
        dedupe: {},
      } as any,
    });
    const impact = phase06_narrative(world);
    const narrativeEvents = impact.events?.filter((e) => e.category === "narrative") ?? [];
    // The agent should trigger a retirement_ceremony event
    const retirementEvent = narrativeEvents.find((e) => e.type === "RETIREMENT_ANNOUNCED");
    expect(retirementEvent).toBeDefined();
  });

  it("no achievements → no narrative event", () => {
    const world = makeWorld({
      history: [],
      cyclePhase: "interim",
    });
    const impact = phase06_narrative(world);
    const narrativeEvents = impact.events?.filter((e) => e.category === "narrative") ?? [];
    expect(narrativeEvents.length).toBe(0);
  });

  it("no playerHeyaId → no narrative agent runs", () => {
    const world = makeWorld({
      playerHeyaId: undefined,
      history: [makeBashoResult({ yusho: "r1" })],
      cyclePhase: "post_basho",
    });
    const impact = phase06_narrative(world);
    const narrativeEvents = impact.events?.filter((e) => e.category === "narrative") ?? [];
    expect(narrativeEvents.length).toBe(0);
  });

  it("oyakata not found → no error, no event", () => {
    const world = makeWorld({
      oyakata: new Map(),
      history: [makeBashoResult({ yusho: "r1" })],
      cyclePhase: "post_basho",
    });
    expect(() => phase06_narrative(world)).not.toThrow();
    const impact = phase06_narrative(world);
    const narrativeEvents = impact.events?.filter((e) => e.category === "narrative") ?? [];
    expect(narrativeEvents.length).toBe(0);
  });

  it("publicity hawk during active_basho → NARRATIVE_STRATEGY_SHIFT event", () => {
    const oyakata = makeOyakata({
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 30, compassion: 50 },
      managerFlags: { publicityHawk: true },
    });
    const world = makeWorld({
      oyakata: new Map([["oyakata-1", oyakata]]),
      cyclePhase: "active_basho",
      history: [],
    });
    const impact = phase06_narrative(world);
    const narrativeEvents = impact.events?.filter((e) => e.category === "narrative") ?? [];
    const spotlightEvent = narrativeEvents.find((e) => e.type === "NARRATIVE_STRATEGY_SHIFT");
    expect(spotlightEvent).toBeDefined();
  });

  it("all narrative events resolve without [MISSING:] tokens", () => {
    const world = makeWorld({
      history: [makeBashoResult({ yusho: "r1" })],
      cyclePhase: "post_basho",
    });
    const impact = phase06_narrative(world);
    const narrativeEvents = impact.events?.filter((e) => e.category === "narrative") ?? [];
    for (const evt of narrativeEvents) {
      const data = evt.data as any;
      if (data?.title) expect(data.title).not.toContain("[MISSING:");
      if (data?.summary) expect(data.summary).not.toContain("[MISSING:");
    }
  });

  it("yusho event has 'headline' importance", () => {
    const world = makeWorld({
      history: [makeBashoResult({ yusho: "r1" })],
      cyclePhase: "post_basho",
    });
    const impact = phase06_narrative(world);
    const awardEvent = impact.events?.find(
      (e) => e.category === "narrative" && e.type === "AWARD_CONFERRED"
    );
    expect(awardEvent?.importance).toBe("headline");
  });

  it("media spotlight event has 'notable' importance", () => {
    const oyakata = makeOyakata({
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 30, compassion: 50 },
      managerFlags: { publicityHawk: true },
    });
    const world = makeWorld({
      oyakata: new Map([["oyakata-1", oyakata]]),
      cyclePhase: "active_basho",
      history: [],
    });
    const impact = phase06_narrative(world);
    const spotlightEvent = impact.events?.find(
      (e) => e.category === "narrative" && e.type === "NARRATIVE_STRATEGY_SHIFT"
    );
    expect(spotlightEvent?.importance).toBe("notable");
  });
});
