/**
 * WS2 — Archetype adaptation engine (canon §§8–11, §15).
 *
 * Meta perception is deliberately delayed: managers observe completed yearly
 * assessments, wait an archetype-scaled reaction lag, require confirmation,
 * then commit a posture that drives real levers — bid family bias, recovery
 * emphasis, and scouting posture.
 */

import { describe, it, expect } from "vitest";
import {
  updateMetaAdaptation,
  evaluateAdaptation,
  type MetaAdaptationState,
} from "@/engine/npcAI/ArchetypeAdaptation";
import type { OyakataMemory } from "@/engine/ai/types";
import { buildMetaPerception } from "@/engine/npcAI/MetaPerception";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { MetaPerception } from "@/engine/ai/types";
import type { Oyakata } from "@/engine/types/oyakata";
import type { WorldState } from "@/engine/types/world";

const TRAITS = { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 };

const PUSH_META: MetaPerception = {
  eraTone: "explosive",
  dominantFamily: "push",
  dominanceBand: "established",
  familyPresence: { push: "ascendant", belt: "present", speed: "present", trick: "absent" },
  trend: "strengthening",
  injuryClimate: "normal",
};

const BELT_META: MetaPerception = {
  eraTone: "classic",
  dominantFamily: "belt",
  dominanceBand: "established",
  familyPresence: { push: "waning", belt: "ascendant", speed: "present", trick: "present" },
  trend: "strengthening",
  injuryClimate: "normal",
};

const CALM_META: MetaPerception = {
  eraTone: "classic",
  dominantFamily: "none",
  dominanceBand: "unclear",
  familyPresence: { push: "present", belt: "present", speed: "present", trick: "present" },
  trend: "stable",
  injuryClimate: "low",
};

function worldWithOyakata(archetype: Oyakata["archetype"], quirks: string[] = []): WorldState {
  const world = MockFactory.createWorld({ week: 10 });
  world.heyas.set("h1", MockFactory.createHeya("h1", { oyakataId: "o1" }));
  world.oyakata.set("o1", {
    id: "o1",
    heyaId: "h1",
    archetype,
    traits: { ...TRAITS },
    quirks,
    yearsInCharge: 5,
    shikona: "Test Oyakata",
    name: "Test Oyakata",
  } as unknown as Oyakata);
  return world;
}

function memoryWith(state: MetaAdaptationState): OyakataMemory {
  return {
    observations: [],
    coreDirectives: [],
    lastConsolidationTick: 0,
    planHistory: [],
    decisionHistory: [],
    opponentModels: {},
    metaAdaptation: state,
  };
}

function emptyMemory(): OyakataMemory {
  return {
    observations: [],
    coreDirectives: [],
    lastConsolidationTick: 0,
    planHistory: [],
    decisionHistory: [],
    opponentModels: {},
  };
}

describe("reaction lag (canon §8.1)", () => {
  it("does not commit before the archetype minimum delay", () => {
    const world = worldWithOyakata("traditionalist");
    const mem = memoryWith({ observedFamily: "push", sinceWeek: 10, confirmations: 2 });

    // Traditionalist lag is ~54 weeks; only 10 have elapsed.
    const { adaptation } = updateMetaAdaptation(
      world,
      mem,
      "traditionalist",
      TRAITS,
      [],
      PUSH_META,
      19
    );
    expect(adaptation.posture).toBe("none");
  });

  it("commits once the lag window has elapsed and trend is confirmed", () => {
    const world = worldWithOyakata("traditionalist");
    const mem = memoryWith({ observedFamily: "push", sinceWeek: 0, confirmations: 2 });

    const { state, adaptation } = updateMetaAdaptation(
      world,
      mem,
      "traditionalist",
      TRAITS,
      [],
      PUSH_META,
      60
    );
    expect(state.committedPosture).toBeDefined();
    expect(adaptation.posture).not.toBe("none");
  });

  it("gambler commits within the fast window", () => {
    const world = worldWithOyakata("gambler");
    const mem = memoryWith({ observedFamily: "push", sinceWeek: 0, confirmations: 0 });

    // Gambler lag ≈ 1 basho (~9 weeks).
    const { adaptation } = updateMetaAdaptation(
      world,
      mem,
      "gambler",
      TRAITS,
      ["Gambler's Instinct"],
      PUSH_META,
      12
    );
    expect(adaptation.posture).not.toBe("none");
  });

  it("resets the lag clock when the observed dominant family changes", () => {
    const world = worldWithOyakata("traditionalist");
    const mem = memoryWith({ observedFamily: "push", sinceWeek: 0, confirmations: 4 });

    const { state, adaptation } = updateMetaAdaptation(
      world,
      mem,
      "traditionalist",
      TRAITS,
      [],
      BELT_META,
      100
    );
    // New signal (belt) — the clock restarts, no commitment yet.
    expect(state.observedFamily).toBe("belt");
    expect(state.sinceWeek).toBe(100);
    expect(adaptation.posture).toBe("none");
  });
});

describe("posture selection (canon §§10–11)", () => {
  const agedMem = memoryWith({ observedFamily: "push", sinceWeek: 0, confirmations: 5 });

  it("traditionalist counters an established push meta (§10.1)", () => {
    const world = worldWithOyakata("traditionalist");
    const { adaptation } = updateMetaAdaptation(
      world,
      agedMem,
      "traditionalist",
      { ...TRAITS, tradition: 80 },
      [],
      PUSH_META,
      80
    );
    expect(adaptation.posture).toBe("counter_meta");
    expect(adaptation.bidFamilyBias?.family).toBe("belt");
  });

  it("strategist embraces the dominant meta", () => {
    const world = worldWithOyakata("strategist");
    const { adaptation } = updateMetaAdaptation(
      world,
      agedMem,
      "strategist",
      TRAITS,
      [],
      PUSH_META,
      40
    );
    expect(adaptation.posture).toBe("embrace_meta");
    expect(adaptation.bidFamilyBias?.family).toBe("push");
  });

  it("traditionalist reinforces identity under a belt meta (§10.2)", () => {
    const world = worldWithOyakata("traditionalist");
    const beltAged = memoryWith({ observedFamily: "belt", sinceWeek: 0, confirmations: 5 });
    const { adaptation } = updateMetaAdaptation(
      world,
      beltAged,
      "traditionalist",
      { ...TRAITS, tradition: 80 },
      [],
      BELT_META,
      80
    );
    expect(adaptation.posture).toBe("embrace_meta");
    expect(adaptation.bidFamilyBias?.family).toBe("belt");
  });

  it("elevated injury climate drives recovery emphasis for welfare-minded managers", () => {
    const hurtMeta: MetaPerception = { ...CALM_META, injuryClimate: "elevated" };
    const world = worldWithOyakata("nurturer");
    const mem = emptyMemory();

    const { adaptation } = updateMetaAdaptation(
      world,
      mem,
      "nurturer",
      { ...TRAITS, compassion: 80 },
      [],
      hurtMeta,
      10
    );
    expect(adaptation.recoveryOverride).toBe("high");
  });

  it("no dominant family → no posture", () => {
    const world = worldWithOyakata("strategist");
    const { adaptation } = updateMetaAdaptation(
      world,
      emptyMemory(),
      "strategist",
      TRAITS,
      [],
      CALM_META,
      10
    );
    expect(adaptation.posture).toBe("none");
    expect(adaptation.bidFamilyBias).toBeUndefined();
  });
});

describe("evaluateAdaptation integration", () => {
  it("derives perception from world.meta and writes banded bid bias into policy", () => {
    const world = worldWithOyakata("strategist");
    world.meta = {
      tone: "explosive",
      drift: {},
      history: [
        {
          year: 2029,
          tone: "explosive",
          familyShares: { push: 0.62, belt: 0.2, speed: 0.1, trick: 0.08 },
        },
        {
          year: 2030,
          tone: "explosive",
          familyShares: { push: 0.68, belt: 0.17, speed: 0.08, trick: 0.07 },
        },
      ],
    };
    world.week = 200;
    const oyakata = world.oyakata.get("o1")!;
    oyakata.memory = memoryWith({ observedFamily: "push", sinceWeek: 0, confirmations: 3 });

    const { adaptation, state } = evaluateAdaptation(world, "h1");
    expect(adaptation.posture).toBe("embrace_meta");
    expect(state.committedPosture).toBe("embrace_meta");
  });

  it("is deterministic — same inputs produce identical output", () => {
    const world = worldWithOyakata("gambler");
    world.meta = {
      tone: "explosive",
      drift: {},
      history: [
        {
          year: 2030,
          tone: "explosive",
          familyShares: { push: 0.6, belt: 0.2, speed: 0.1, trick: 0.1 },
        },
      ],
    };
    const a = evaluateAdaptation(world, "h1");
    const b = evaluateAdaptation(world, "h1");
    expect(a.adaptation).toEqual(b.adaptation);
    expect(a.state).toEqual(b.state);
  });
});

describe("meta adaptation state", () => {
  it("serializes through oyakata.memory round-trip", () => {
    const world = worldWithOyakata("strategist");
    const oya = world.oyakata.get("o1")!;
    oya.memory = memoryWith({
      observedFamily: "push",
      sinceWeek: 12,
      confirmations: 2,
      committedPosture: "embrace_meta",
      committedFamily: "push",
    });
    const json = JSON.parse(JSON.stringify(oya));
    expect(json.memory.metaAdaptation.committedPosture).toBe("embrace_meta");
  });
});
