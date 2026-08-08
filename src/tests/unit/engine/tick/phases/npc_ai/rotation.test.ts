import { describe, it, expect } from "vitest";
import { phase01_week_npc_ai } from "@/engine/tick/phases/phase01_week_npc_ai";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import {
  NPC_AI_ROTATION_DIVISOR,
  NPC_AI_ROTATION_MIN_FULL_SWEEP,
} from "@/constants/engine/npcStrategy";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeOyakataForHeya(heyaId: string): Oyakata {
  return MockFactory.createOyakata(`oy_${heyaId}`, {
    heyaId,
    archetype: "traditionalist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
  });
}

function makeHeyaWithOyakata(id: string): { heya: Heya; oyakata: Oyakata } {
  const oyakata = makeOyakataForHeya(id);
  const heya = MockFactory.createHeya(id, {
    oyakataId: oyakata.id,
    rikishiIds: [],
  });
  return { heya, oyakata };
}

function buildWorldWithNpcHeyas(
  npcCount: number,
  opts: {
    cyclePhase?: WorldState["cyclePhase"];
    week?: number;
    monthBoundary?: boolean;
    playerHeyaId?: string;
    existingPriorities?: Record<string, "none" | "passive" | "active" | "aggressive">;
  } = {}
): WorldState {
  const heyas = new Map<string, Heya>();
  const oyakata = new Map<string, Oyakata>();

  // Player heya
  const playerId = opts.playerHeyaId ?? "player";
  const playerHeya = MockFactory.createHeya(playerId, {
    oyakataId: `oy_${playerId}`,
    isPlayerOwned: true,
  });
  heyas.set(playerId, playerHeya);
  oyakata.set(`oy_${playerId}`, makeOyakataForHeya(playerId));

  // NPC heyas with deterministic IDs: npc_00, npc_01, ...
  for (let i = 0; i < npcCount; i++) {
    const id = `npc_${String(i).padStart(2, "0")}`;
    const { heya, oyakata: oy } = makeHeyaWithOyakata(id);
    heyas.set(id, heya);
    oyakata.set(oy.id, oy);
  }

  return MockFactory.createWorld({
    heyas,
    oyakata,
    playerHeyaId: playerId,
    cyclePhase: opts.cyclePhase ?? "interim",
    week: opts.week ?? 1,
    transientContext: {
      boundaries: {
        monthBoundary: opts.monthBoundary ?? false,
        yearBoundary: false,
      },
    },
    npcScoutingPriorities: opts.existingPriorities ?? {},
    rivalriesState: { pairs: {}, version: "1.0.0" } as any,
  } as any);
}

function getProcessedHeyaIds(impact: ReturnType<typeof phase01_week_npc_ai>): Set<string> {
  const updates = impact.entities?.oyakataUpdates;
  if (!updates) return new Set();
  const processed = new Set<string>();
  for (const [oyId] of updates) {
    // oy IDs are `oy_<heyaId>`
    if (oyId.startsWith("oy_npc_")) {
      processed.add(oyId.replace("oy_", ""));
    }
  }
  return processed;
}

function getScoutingMap(
  impact: ReturnType<typeof phase01_week_npc_ai>
): Record<string, string> {
  return (impact.worldFields?.npcScoutingPriorities ?? {}) as Record<string, string>;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("NPC AI rotation", () => {
  describe("R1: off-season selects ~2/3 of NPC heyas", () => {
    it("selects approximately 2/3 of 43 NPC heyas in off-season non-boundary week", () => {
      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 1,
        monthBoundary: false,
      });
      const impact = phase01_week_npc_ai(world);
      const processed = getProcessedHeyaIds(impact);

      // 43 heyas / 3 groups → ~14 skipped, ~29 processed
      const expectedSelected = 43 - Math.floor(43 / NPC_AI_ROTATION_DIVISOR);
      expect(processed.size).toBeGreaterThanOrEqual(expectedSelected - 1);
      expect(processed.size).toBeLessThanOrEqual(expectedSelected + 1);
      expect(processed.size).toBeLessThan(43);
    });
  });

  describe("R2: active_basho selects all NPC heyas", () => {
    it("processes all 43 NPC heyas during active_basho", () => {
      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "active_basho",
        week: 1,
        monthBoundary: false,
      });
      const impact = phase01_week_npc_ai(world);
      const processed = getProcessedHeyaIds(impact);

      expect(processed.size).toBe(43);
    });
  });

  describe("R3: monthly boundary selects all NPC heyas", () => {
    it("processes all NPC heyas when monthBoundary is true", () => {
      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 4,
        monthBoundary: true,
      });
      const impact = phase01_week_npc_ai(world);
      const processed = getProcessedHeyaIds(impact);

      expect(processed.size).toBe(43);
    });
  });

  describe("R4: every heya selected at least once over 3 weeks", () => {
    it("union of 3 consecutive weeks covers all NPC heyas", () => {
      const allProcessed = new Set<string>();

      for (let w = 1; w <= 3; w++) {
        const world = buildWorldWithNpcHeyas(43, {
          cyclePhase: "interim",
          week: w,
          monthBoundary: false,
        });
        const impact = phase01_week_npc_ai(world);
        const processed = getProcessedHeyaIds(impact);
        for (const id of processed) allProcessed.add(id);
      }

      // Every NPC heya should be covered
      expect(allProcessed.size).toBe(43);
    });
  });

  describe("R5: deterministic for same week", () => {
    it("produces same subset for same world + same week on repeated calls", () => {
      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 5,
        monthBoundary: false,
      });

      const impact1 = phase01_week_npc_ai(world);
      const processed1 = getProcessedHeyaIds(impact1);

      const impact2 = phase01_week_npc_ai(world);
      const processed2 = getProcessedHeyaIds(impact2);

      expect(Array.from(processed1).sort()).toEqual(Array.from(processed2).sort());
    });
  });

  describe("R6: skipped heyas retain scouting priority", () => {
    it("skipped heya keeps its previous scouting priority in output", () => {
      // Week 1: skipGroup = 1 % 3 = 1, groupSize = 14, skipStart = 14, skipEnd = 28
      // Skipped heyas: npc_14 through npc_27
      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 1,
        monthBoundary: false,
        existingPriorities: {
          npc_14: "active",
          npc_20: "passive",
          npc_27: "aggressive",
        },
      });

      const impact = phase01_week_npc_ai(world);
      const scoutingMap = getScoutingMap(impact);

      // Skipped heyas should retain their previous priorities
      expect(scoutingMap["npc_14"]).toBe("active");
      expect(scoutingMap["npc_20"]).toBe("passive");
      expect(scoutingMap["npc_27"]).toBe("aggressive");
    });
  });

  describe("R7: small heya count triggers full sweep", () => {
    it("processes all heyas when count <= MIN_FULL_SWEEP", () => {
      const smallCount = NPC_AI_ROTATION_MIN_FULL_SWEEP; // exactly at threshold
      const world = buildWorldWithNpcHeyas(smallCount, {
        cyclePhase: "interim",
        week: 1,
        monthBoundary: false,
      });
      const impact = phase01_week_npc_ai(world);
      const processed = getProcessedHeyaIds(impact);

      expect(processed.size).toBe(smallCount);
    });

    it("processes all heyas when count < MIN_FULL_SWEEP", () => {
      const world = buildWorldWithNpcHeyas(8, {
        cyclePhase: "interim",
        week: 1,
        monthBoundary: false,
      });
      const impact = phase01_week_npc_ai(world);
      const processed = getProcessedHeyaIds(impact);

      expect(processed.size).toBe(8);
    });
  });

  describe("R8: scoutingMap carries forward all existing priorities", () => {
    it("all pre-existing priorities present even when most heyas are skipped", () => {
      // With 43 heyas and rotation, ~14 are skipped. Set priorities for 3 heyas
      // that span different rotation groups.
      const priorities: Record<string, "none" | "passive" | "active" | "aggressive"> = {};
      for (let i = 0; i < 43; i++) {
        const id = `npc_${String(i).padStart(2, "0")}`;
        priorities[id] = i % 3 === 0 ? "active" : i % 3 === 1 ? "passive" : "aggressive";
      }

      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 1,
        monthBoundary: false,
        existingPriorities: priorities,
      });

      const impact = phase01_week_npc_ai(world);
      const scoutingMap = getScoutingMap(impact);

      // Every priority should be present — skipped ones carry forward, processed ones get new values
      for (let i = 0; i < 43; i++) {
        const id = `npc_${String(i).padStart(2, "0")}`;
        expect(scoutingMap[id]).toBeDefined();
      }
    });
  });

  describe("R9: pre_basho phase uses rotation", () => {
    it("rotation applies during pre_basho (not full sweep)", () => {
      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "pre_basho",
        week: 1,
        monthBoundary: false,
      });
      const impact = phase01_week_npc_ai(world);
      const processed = getProcessedHeyaIds(impact);

      // Should NOT be full sweep — rotation applies
      expect(processed.size).toBeLessThan(43);
      expect(processed.size).toBeGreaterThan(20);
    });
  });

  describe("R10: enforceHardCapRosterOverflow still runs for skipped heyas", () => {
    it("skipped heya with > 30 rikishi still gets overflow enforcement", () => {
      // Create a world with 43 heyas but give one heya 35 rikishi
      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 1,
        monthBoundary: false,
      });

      // Give npc_00 35 rikishi (over the 30 hard cap)
      const targetHeya = world.heyas.get("npc_00")!;
      const rikishiIds: string[] = [];
      const rikishiMap = new Map(world.rikishi);
      for (let i = 0; i < 35; i++) {
        const rId = `overflow_r_${i}`;
        const r = MockFactory.createRikishi(rId, { heyaId: "npc_00" });
        rikishiMap.set(rId, r);
        rikishiIds.push(rId);
      }
      targetHeya.rikishiIds = rikishiIds;
      world.heyas = new Map(world.heyas);
      world.heyas.set("npc_00", targetHeya);
      world.rikishi = rikishiMap;
      world.activeRikishiIds = new Set(
        Array.from(rikishiMap.entries())
          .filter(([, r]) => !(r as any)?.isRetired)
          .map(([k]) => k)
      );

      const impact = phase01_week_npc_ai(world);

      // Resolve and check that the heya's roster was trimmed
      const resolved = resolveImpacts(world, [impact]);
      const trimmedHeya = resolved.heyas.get("npc_00");
      expect(trimmedHeya).toBeDefined();
      if (trimmedHeya) {
        expect(trimmedHeya.rikishiIds?.length ?? 0).toBeLessThanOrEqual(30);
      }
    });
  });

  describe("R11: no oyakata update for skipped heyas", () => {
    it("skipped heyas do not appear in oyakataUpdates", () => {
      const world = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 1,
        monthBoundary: false,
      });
      const impact = phase01_week_npc_ai(world);
      const processed = getProcessedHeyaIds(impact);

      // Find a skipped heya
      const allNpcIds = new Set<string>();
      for (let i = 0; i < 43; i++) {
        allNpcIds.add(`npc_${String(i).padStart(2, "0")}`);
      }
      const skipped = Array.from(allNpcIds).filter((id) => !processed.has(id));

      // There should be skipped heyas
      expect(skipped.length).toBeGreaterThan(0);

      // Verify skipped heyas' oyakata are NOT in oyakataUpdates
      const oyakataUpdates = impact.entities?.oyakataUpdates;
      if (oyakataUpdates) {
        for (const skippedId of skipped) {
          const oyId = `oy_${skippedId}`;
          expect(oyakataUpdates.has(oyId)).toBe(false);
        }
      }
    });
  });

  describe("R12: sim hash stable across runs with rotation", () => {
    it("produces identical scouting map for same seed + week on independent calls", () => {
      const world1 = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 7,
        monthBoundary: false,
      });
      const world2 = buildWorldWithNpcHeyas(43, {
        cyclePhase: "interim",
        week: 7,
        monthBoundary: false,
      });

      const impact1 = phase01_week_npc_ai(world1);
      const impact2 = phase01_week_npc_ai(world2);

      const map1 = JSON.stringify(getScoutingMap(impact1), Object.keys(getScoutingMap(impact1)).sort());
      const map2 = JSON.stringify(getScoutingMap(impact2), Object.keys(getScoutingMap(impact2)).sort());

      expect(map1).toBe(map2);
    });
  });
});
