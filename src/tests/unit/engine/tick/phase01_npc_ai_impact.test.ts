import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "../utils";
import { phase01_week_npc_ai } from "@/engine/tick/phases/phase01_week_npc_ai";
import type { GovernanceRuling } from "@/engine/types/economy";
import type { MediaState } from "@/engine/types/media";

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

/**
 * Regression coverage for the worldField snapshot-clobber defect: producers
 * compute read-modify-write snapshots (npcBidPolicies, governanceLog,
 * mediaState) off the phase base; a last-write-wins merge keeps only the
 * final producer's snapshot. The phase must compose them through a running
 * overlay so every heya's writes land.
 */
function makeRuling(id: string, heyaId: string): GovernanceRuling {
  return {
    id,
    date: "w1",
    heyaId,
    type: "warning",
    severity: "medium",
    reason: "test ruling",
    effects: {},
  };
}

function makeMediaState(): MediaState {
  return {
    version: "1",
    headlines: [],
    mediaHeat: {},
    heyaPressure: {},
    bashoStreaks: {},
    streakHeadlinesFired: {},
    promoWatchFired: {},
    retirementWatchFired: {},
    titleRaceDayFired: {},
    injuryWithdrawalFired: {},
    mediaHeatHistory: {},
    absenceAnnouncements: [],
  };
}

describe("phase01_week_npc_ai — worldField snapshot composition", () => {
  it("keeps every NPC heya's bid policy, not just the last merged", () => {
    const { world } = setupWorld();
    const heya2 = makeMockHeya("h2", {
      oyakataId: "o2",
      runwayBand: "comfortable",
      rikishiIds: [],
    });
    world.heyas.set("h2", heya2);
    world.oyakata.set("o2", {
      id: "o2",
      heyaId: "h2",
      name: "Oya2",
      archetype: "hardliner",
      traits: { ambition: 80, risk: 80, tradition: 50, patience: 20, compassion: 10 },
    } as any);

    const impact = phase01_week_npc_ai(world);
    const policies = impact.worldFields?.npcBidPolicies as
      Record<string, { shouldBid: boolean }> | undefined;
    expect(policies?.h1).toBeDefined();
    expect(policies?.h2).toBeDefined();
  });

  it("marks every unresolved ruling resolved, not just the last merged", () => {
    const { world } = setupWorld();
    world.mediaState = makeMediaState();
    world.governanceLog = [makeRuling("r1", "h1"), makeRuling("r2", "h1")];

    const impact = phase01_week_npc_ai(world);
    const log = (impact.worldFields?.governanceLog ?? []) as GovernanceRuling[];
    const byId = new Map(log.map((r) => [r.id, r]));
    expect(byId.get("r1")?.actorChoice).toBeDefined();
    expect(byId.get("r2")?.actorChoice).toBeDefined();
    expect(byId.get("r1")?.actorId).toBe("h1");
    expect(byId.get("r2")?.actorId).toBe("h1");
  });
});
