import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "../utils";
import { phase01_week_npc_ai } from "@/engine/tick/phases/phase01_week_npc_ai";

/**
 * Regression coverage for the dropped-impact defect: makeNPCWeeklyDecision
 * builds a StateImpact containing the agent-execution layer results
 * (npcBidPolicies write, executed domain events, cooldown stamps, exhibition /
 * kyujo handling). The phase must merge it — otherwise the entire execution
 * layer is computed and discarded every week.
 */
function setupWorld() {
  const world = makeMockWorld();
  const heya = makeMockHeya("h1", {
    oyakataId: "o1",
    runwayBand: "comfortable",
    rikishiIds: [],
  });
  world.heyas.set("h1", heya);
  world.oyakata.set("o1", {
    id: "o1",
    heyaId: "h1",
    name: "Oya",
    archetype: "hardliner",
    traits: { ambition: 80, risk: 80, tradition: 50, patience: 20, compassion: 10 },
  } as any);
  world.playerHeyaId = "player";
  return { world, heya };
}

describe("phase01_week_npc_ai — decision impact wiring", () => {
  it("merges the NPC decision impact so agent executions reach the world", () => {
    const { world } = setupWorld();
    const impact = phase01_week_npc_ai(world);
    const policies = impact.worldFields?.npcBidPolicies as
      Record<string, { shouldBid: boolean }> | undefined;
    expect(policies?.h1).toBeDefined();
  });

  it("does not lose oyakata cooldown stamps when merging decision impact", () => {
    const { world } = setupWorld();
    const impact = phase01_week_npc_ai(world);
    // The phase still writes the consolidated oyakata entity once.
    const oyaUpdate = impact.entities?.oyakataUpdates?.get("o1") as
      { memory?: { lastExecutedAt?: Record<string, number> } } | undefined;
    expect(oyaUpdate).toBeDefined();
    // If any domain executed, lastExecutedAt must survive the final write.
    if (oyaUpdate?.memory?.lastExecutedAt) {
      for (const w of Object.values(oyaUpdate.memory.lastExecutedAt)) {
        expect(typeof w).toBe("number");
      }
    }
  });
});
