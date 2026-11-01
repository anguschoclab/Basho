import { describe, it, expect } from "vitest";
import { phase01_week_npc_ai } from "@/engine/tick/phases/phase01_week_npc_ai";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { makeMockHeya, makeMockWorld } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";

/**
 * Characterization test for the `heya.rikishiIds` deduplication inside
 * maybeAssignNPCMentors / maybeAssignNPCSparringPairs (phase01_week_npc_ai).
 *
 * A duplicated roster id must be processed exactly once: mentor assignment
 * fires once per apprentice and sparring pairs never reuse or self-pair a
 * rikishi. Pinned before the manual-dedup refactor (PR #1154) — behavior must
 * be identical after.
 */

function buildDupRosterWorld(): WorldState {
  const world = makeMockWorld({ week: 10, year: 2030 });
  if (!world.events) {
    world.events = { version: "1.0.0", log: [], dedupe: {} } as never;
  }

  const npcHeya = makeMockHeya("h-npc", {
    oyakataId: "o-npc",
    // Deliberately duplicated ids — the phase must dedupe before processing.
    rikishiIds: ["r-app1", "r-men", "r-app2", "r-app1", "r-men", "r-app2"],
  });
  const playerHeya = makeMockHeya("h-player", { prestige: 50 });
  world.heyas.set("h-npc", npcHeya);
  world.heyas.set("h-player", playerHeya);
  world.playerHeyaId = "h-player";
  world.oyakata.set("o-npc", MockFactory.createOyakata("o-npc", { heyaId: "h-npc" }));

  const mk = (id: string, rank: string, technique: number) =>
    world.rikishi.set(
      id,
      MockFactory.createRikishi(id, { heyaId: "h-npc", rank: rank as never, stats: { technique } as never })
    );
  mk("r-men", "juryo", 80); // sekitori mentor
  mk("r-app1", "jonokuchi", 10);
  mk("r-app2", "jonokuchi", 10);

  return world;
}

describe("phase01_week_npc_ai — roster-id deduplication", () => {
  it("assigns a mentor to each unique apprentice exactly once", () => {
    const world = buildDupRosterWorld();
    const impact = phase01_week_npc_ai(world);

    const mentorEvents = (impact.events ?? []).filter(
      (e) => (e.data as Record<string, unknown>).status === "mentor_assigned"
    );
    const assignedIds = mentorEvents.map((e) => (e.data as Record<string, unknown>).rikishiId);

    expect(assignedIds.sort()).toEqual(["r-app1", "r-app2"]);
    expect(new Set(assignedIds).size).toBe(assignedIds.length);
  });

  it("sparring pairs contain unique, non-self-paired rikishi", () => {
    const world = buildDupRosterWorld();
    const impact = phase01_week_npc_ai(world);

    const pairEvents = (impact.events ?? []).filter(
      (e) => (e.data as Record<string, unknown>).status === "sparring_pair_assigned"
    );
    const usedIds = new Set<string>();
    for (const e of pairEvents) {
      const d = e.data as Record<string, unknown>;
      expect(d.aId).not.toBe(d.bId);
      expect(usedIds.has(d.aId as string)).toBe(false);
      expect(usedIds.has(d.bId as string)).toBe(false);
      usedIds.add(d.aId as string);
      usedIds.add(d.bId as string);
    }
    expect(pairEvents.length).toBeGreaterThan(0);
  });
});
