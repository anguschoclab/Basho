import { describe, it, expect } from "vitest";
import { runArchivalPruning } from "@/engine/archival";
import { makeMockWorld, mockRikishi } from "./utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi, RikishiStats } from "@/engine/types/rikishi";
import type { Rank } from "@/engine/types/banzuke";

// ── helpers ────────────────────────────────────────────────────────────────

function makeHistoricalRikishi(
  id: string,
  rank: string,
  overrides?: Partial<Rikishi>
): Rikishi {
  return mockRikishi(id, {
    rank: rank as Rank,
    isRetired: true,
    bashoHistory: [{ bashoId: "test" }],
    pbpLogs: [{ log: "test" }],
    trainingHistory: [{ week: 1 }],
    perceptionHistory: [{ event: "test" }],
    milestones: [{ type: "debut", year: 2020 } as unknown],
    economics: { salary: 100000 } as unknown as Rikishi["economics"],
    baseStats: { power: 50, technique: 50, speed: 50, balance: 50, weight: 140, stamina: 100, mental: 50, adaptability: 50, aggression: 50, experience: 50 } as RikishiStats,
    currentStats: { power: 60, technique: 60, speed: 60, balance: 60, weight: 140, stamina: 100, mental: 60, adaptability: 60, aggression: 60, experience: 60 } as RikishiStats,
    skills: { tree: "test" },
    careerRecord: { wins: 10, losses: 5, yusho: 0 },
    ...overrides,
  });
}

function makeWorldWithHistorical(rikishi: Rikishi[]): WorldState {
  const world = makeMockWorld();
  world.historicalRikishi = new Map(rikishi.map((r) => [r.id, r]));
  return world;
}

function getRikishiUpdates(impact: ReturnType<typeof runArchivalPruning>) {
  const updates = impact.entities?.rikishiUpdates;
  expect(updates, "rikishiUpdates should exist").toBeDefined();
  return updates!;
}

// ── Tier 1: legendary — no pruning ─────────────────────────────────────────

describe("runArchivalPruning — Tier 1 (legendary, no pruning)", () => {
  const tier1Ranks = ["yokozuna", "ozeki", "sekiwake"];

  for (const rank of tier1Ranks) {
    it(`rank="${rank}" → isPruned not set, all fields retained`, () => {
      const r = makeHistoricalRikishi("r1", rank);
      const world = makeWorldWithHistorical([r]);
      const impact = runArchivalPruning(world);
      const updates = getRikishiUpdates(impact);
      const entry = updates.get("r1");

      expect(entry).toBeDefined();
      expect(entry!.isPruned).toBeUndefined();
      expect(entry!.pruningTier).toBeUndefined();
      expect(entry!.bashoHistory).toBeDefined();
      expect(entry!.pbpLogs).toBeDefined();
      expect(entry!.trainingHistory).toBeDefined();
      expect(entry!.perceptionHistory).toBeDefined();
      expect(entry!.milestones).toBeDefined();
      expect(entry!.economics).toBeDefined();
      expect(entry!.baseStats).toBeDefined();
      expect(entry!.currentStats).toBeDefined();
      expect(entry!.skills).toBeDefined();
    });
  }

  it("rank='maegashira' with yusho=1 → tier 1 via yusho", () => {
    const r = makeHistoricalRikishi("r1", "maegashira", {
      careerRecord: { wins: 10, losses: 5, yusho: 1 },
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r1");

    expect(entry).toBeDefined();
    expect(entry!.isPruned).toBeUndefined();
    expect(entry!.milestones).toBeDefined();
  });

  it("rank='jonokuchi' with yusho=3 → tier 1 via yusho (any rank)", () => {
    const r = makeHistoricalRikishi("r1", "jonokuchi", {
      careerRecord: { wins: 0, losses: 0, yusho: 3 },
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r1");

    expect(entry).toBeDefined();
    expect(entry!.isPruned).toBeUndefined();
  });
});

// ── Tier 2: sekitori — partial pruning ─────────────────────────────────────

describe("runArchivalPruning — Tier 2 (sekitori, partial pruning)", () => {
  const tier2Ranks = ["komusubi", "maegashira", "juryo"];

  for (const rank of tier2Ranks) {
    it(`rank="${rank}" → isPruned=true, pruningTier=2`, () => {
      const r = makeHistoricalRikishi("r2", rank);
      const world = makeWorldWithHistorical([r]);
      const impact = runArchivalPruning(world);
      const entry = getRikishiUpdates(impact).get("r2");

      expect(entry).toBeDefined();
      expect(entry!.isPruned).toBe(true);
      expect(entry!.pruningTier).toBe(2);
    });
  }

  it("deletes session-heavy data (bashoHistory, pbpLogs, trainingHistory, perceptionHistory)", () => {
    const r = makeHistoricalRikishi("r2", "maegashira");
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r2");

    expect(entry).toBeDefined();
    expect("bashoHistory" in entry!).toBe(false);
    expect("pbpLogs" in entry!).toBe(false);
    expect("trainingHistory" in entry!).toBe(false);
    expect("perceptionHistory" in entry!).toBe(false);
  });

  it("retains milestones, economics, baseStats, currentStats, skills, shikona, careerRecord", () => {
    const r = makeHistoricalRikishi("r2", "maegashira");
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r2");

    expect(entry).toBeDefined();
    expect(entry!.milestones).toBeDefined();
    expect(entry!.economics).toBeDefined();
    expect(entry!.baseStats).toBeDefined();
    expect(entry!.currentStats).toBeDefined();
    expect(entry!.skills).toBeDefined();
    expect(entry!.shikona).toBeDefined();
    expect(entry!.careerRecord).toBeDefined();
  });
});

// ── Tier 3: clerical — minimal record ──────────────────────────────────────

describe("runArchivalPruning — Tier 3 (clerical, minimal record)", () => {
  const tier3Ranks = ["makushita", "sandanme", "jonidan", "jonokuchi"];

  for (const rank of tier3Ranks) {
    it(`rank="${rank}" → isPruned=true, pruningTier=3`, () => {
      const r = makeHistoricalRikishi("r3", rank);
      const world = makeWorldWithHistorical([r]);
      const impact = runArchivalPruning(world);
      const entry = getRikishiUpdates(impact).get("r3");

      expect(entry).toBeDefined();
      expect(entry!.isPruned).toBe(true);
      expect(entry!.pruningTier).toBe(3);
    });
  }

  it("deletes all session data plus milestones, economics, baseStats, currentStats, skills", () => {
    const r = makeHistoricalRikishi("r3", "makushita");
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r3");

    expect(entry).toBeDefined();
    expect("bashoHistory" in entry!).toBe(false);
    expect("pbpLogs" in entry!).toBe(false);
    expect("trainingHistory" in entry!).toBe(false);
    expect("perceptionHistory" in entry!).toBe(false);
    expect("milestones" in entry!).toBe(false);
    expect("economics" in entry!).toBe(false);
    expect("baseStats" in entry!).toBe(false);
    expect("currentStats" in entry!).toBe(false);
    expect("skills" in entry!).toBe(false);
  });

  it("retains shikona, heyaId, careerRecord, id", () => {
    const r = makeHistoricalRikishi("r3", "makushita");
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r3");

    expect(entry).toBeDefined();
    expect(entry!.shikona).toBeDefined();
    expect(entry!.heyaId).toBeDefined();
    expect(entry!.careerRecord).toBeDefined();
    expect(entry!.id).toBe("r3");
  });
});

// ── Already-pruned skipping ─────────────────────────────────────────────────

describe("runArchivalPruning — already-pruned skipping", () => {
  it("already-pruned rikishi is not re-pruned (pruningTier stays unchanged)", () => {
    const r = makeHistoricalRikishi("rp", "maegashira", {
      isPruned: true,
      pruningTier: 2,
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("rp");

    expect(entry).toBeDefined();
    // Entry should be the original unmodified object (no re-pruning)
    expect(entry!.isPruned).toBe(true);
    expect(entry!.pruningTier).toBe(2);
  });
});

// ── Empty / missing historicalRikishi ──────────────────────────────────────

describe("runArchivalPruning — empty/missing historicalRikishi", () => {
  it("empty Map → impact has no rikishiUpdates entries", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map();
    const impact = runArchivalPruning(world);
    const updates = impact.entities?.rikishiUpdates;
    // Could be undefined or empty Map
    if (updates) {
      expect(updates.size).toBe(0);
    }
  });

  it("undefined historicalRikishi → returns early with empty impact", () => {
    const world = makeMockWorld();
    world.historicalRikishi = undefined as unknown as Map<string, Rikishi>;
    const impact = runArchivalPruning(world);
    // Should not have any entity updates
    const updates = impact.entities?.rikishiUpdates;
    if (updates) {
      expect(updates.size).toBe(0);
    }
  });
});

// ── Mixed batch ────────────────────────────────────────────────────────────

describe("runArchivalPruning — mixed batch", () => {
  it("yokozuna (tier 1) + maegashira (tier 2) + jonokuchi (tier 3) each get correct treatment", () => {
    const r1 = makeHistoricalRikishi("legend", "yokozuna");
    const r2 = makeHistoricalRikishi("sekitori", "maegashira");
    const r3 = makeHistoricalRikishi("clerk", "jonokuchi");
    const world = makeWorldWithHistorical([r1, r2, r3]);
    const impact = runArchivalPruning(world);
    const updates = getRikishiUpdates(impact);

    // All 3 appear in updates (per Finding 2: all entries are iterated)
    expect(updates.size).toBe(3);

    const e1 = updates.get("legend")!;
    expect(e1.isPruned).toBeUndefined();

    const e2 = updates.get("sekitori")!;
    expect(e2.isPruned).toBe(true);
    expect(e2.pruningTier).toBe(2);

    const e3 = updates.get("clerk")!;
    expect(e3.isPruned).toBe(true);
    expect(e3.pruningTier).toBe(3);
  });
});

// ── Impact structure ───────────────────────────────────────────────────────

describe("runArchivalPruning — impact structure", () => {
  it("metadata.source is 'runArchivalPruning'", () => {
    const world = makeWorldWithHistorical([makeHistoricalRikishi("r1", "maegashira")]);
    const impact = runArchivalPruning(world);
    expect(impact.metadata?.source).toBe("runArchivalPruning");
  });

  it("rikishiUpdates is a Map with correct keys", () => {
    const r = makeHistoricalRikishi("r-struct", "maegashira");
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const updates = getRikishiUpdates(impact);

    expect(updates).toBeInstanceOf(Map);
    expect(updates.has("r-struct")).toBe(true);
  });
});

// ── determineArchivalTier edge cases (tested indirectly) ───────────────────

describe("runArchivalPruning — determineArchivalTier edge cases", () => {
  it("yokozuna with yusho=0 → tier 1 (sanyaku)", () => {
    const r = makeHistoricalRikishi("r1", "yokozuna", {
      careerRecord: { wins: 0, losses: 0, yusho: 0 },
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    expect(getRikishiUpdates(impact).get("r1")!.isPruned).toBeUndefined();
  });

  it("maegashira with yusho=1 → tier 1 (yusho overrides rank)", () => {
    const r = makeHistoricalRikishi("r1", "maegashira", {
      careerRecord: { wins: 10, losses: 5, yusho: 1 },
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    expect(getRikishiUpdates(impact).get("r1")!.isPruned).toBeUndefined();
  });

  it("maegashira with yusho=0 → tier 2", () => {
    const r = makeHistoricalRikishi("r1", "maegashira", {
      careerRecord: { wins: 10, losses: 5, yusho: 0 },
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r1")!;
    expect(entry.isPruned).toBe(true);
    expect(entry.pruningTier).toBe(2);
  });

  it("makushita with yusho=0 → tier 3", () => {
    const r = makeHistoricalRikishi("r1", "makushita", {
      careerRecord: { wins: 10, losses: 5, yusho: 0 },
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r1")!;
    expect(entry.isPruned).toBe(true);
    expect(entry.pruningTier).toBe(3);
  });

  it("careerRecord undefined → yushoCount=0 (falsy || 0)", () => {
    const r = makeHistoricalRikishi("r1", "maegashira", {
      careerRecord: undefined,
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r1")!;
    expect(entry.isPruned).toBe(true);
    expect(entry.pruningTier).toBe(2);
  });

  it("careerRecord.yusho undefined → yushoCount=0", () => {
    const r = makeHistoricalRikishi("r1", "maegashira", {
      careerRecord: { wins: 10, losses: 5 } as { wins: number; losses: number; yusho: number },
    });
    const world = makeWorldWithHistorical([r]);
    const impact = runArchivalPruning(world);
    const entry = getRikishiUpdates(impact).get("r1")!;
    expect(entry.isPruned).toBe(true);
    expect(entry.pruningTier).toBe(2);
  });
});
