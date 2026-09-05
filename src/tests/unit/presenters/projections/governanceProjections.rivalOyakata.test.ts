/**
 * governanceProjections.rivalOyakata.test.ts — tests rival oyakata projection reads NPC_MANAGER_DECISION events.
 * Plan Feature 9 Test-First Protocol item 1.
 */
import { describe, it, expect } from "vitest";
import { projectNPCAgentActivity } from "@/presenters/npcAgentProjections";
import { projectRivalStables } from "@/presenters/rivalStablesProjections";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("rival oyakata projection", () => {
  it("projectNPCAgentActivity returns decisions from event log", () => {
    const world = generateInitialWorld("rival-oyakata-test");
    const projection = projectNPCAgentActivity(world);
    expect(projection).toBeDefined();
    expect(Array.isArray(projection.decisions)).toBe(true);
    expect(typeof projection.decisionsByHeya).toBe("object");
  });

  it("projectRivalStables returns rival stables excluding player heya", () => {
    const world = generateInitialWorld("rival-stables-test");
    const npcProj = projectNPCAgentActivity(world);
    const projection = projectRivalStables(world, npcProj.decisions, npcProj.decisionsByHeya);
    expect(projection).toBeDefined();
    expect(projection.rivals.length).toBeGreaterThan(0);
    // Player heya should not be in rivals
    const playerInRivals = projection.rivals.some((r) => r.heyaId === world.playerHeyaId);
    expect(playerInRivals).toBe(false);
  });

  it("rival stables include heya name and optional ichimon", () => {
    const world = generateInitialWorld("rival-stables-detail-test");
    const npcProj = projectNPCAgentActivity(world);
    const projection = projectRivalStables(world, npcProj.decisions, npcProj.decisionsByHeya);
    for (const rival of projection.rivals) {
      expect(rival.heyaName).toBeDefined();
      expect(typeof rival.heyaName).toBe("string");
    }
  });
});
