/**
 * aiSurfacing.contract.test.ts — WS7 surfacing contract (audit).
 *
 * Every WS1–WS6 behavior must emit a canonical event that lands in the
 * player-facing NPC feed projection. This file exercises the REAL emitters
 * (not hand-built event objects) through resolveImpacts, then asserts the
 * projection picks the rows up.
 *
 * Plus a static wiring check: NPCAgentFeed must have a display label for
 * every category the projection can emit.
 */
import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";
import { projectNPCAgentActivity } from "@/presenters/npcAgentProjections";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { phase01_week_npc_ai } from "@/engine/tick/phases/phase01_week_npc_ai";
import { DynastyService } from "@/engine/systems/legacy/DynastyService";
import { fillVacanciesForNPCWithBidding } from "@/engine/systems/generation/TalentPoolNPCRecruitment";
import { executeAgentDecisions } from "@/engine/npcAI/execution";
import type { AgentDecisions } from "@/engine/npcAI/types";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { makeMockWorld, makeMockHeya } from "../engine/utils";
import type { WorldState } from "@/engine/types/world";

const ROOT = join(__dirname, "../../../..");

function withEvents(world: WorldState): WorldState {
  if (!world.events) {
    world.events = { version: "1.0.0", log: [], dedupe: {} } as never;
  }
  return world;
}

describe("WS7 surfacing contract — emitted events reach the feed", () => {
  it("faction posture election surfaces a faction row", () => {
    const world = withEvents(
      MockFactory.createWorld({ week: 10, year: 2030 })
    );
    // Dominant ichimon leader → coordinated_pressure, targeting the strongest
    // outsider (the player stable).
    const leaderOya = MockFactory.createOyakata("o-lead", { heyaId: "h-lead" });
    const leaderHeya = makeMockHeya("h-lead", {
      oyakataId: "o-lead",
      ichimon: "Dewanoumi",
      politicalCapital: 90,
    } as never);
    const playerHeya = makeMockHeya("h-player", { prestige: 80 });
    world.oyakata.set("o-lead", leaderOya);
    world.heyas.set("h-lead", leaderHeya);
    world.heyas.set("h-player", playerHeya);
    world.playerHeyaId = "h-player";

    const impact = phase01_week_npc_ai(world);
    const resolved = resolveImpacts(world, [impact]);

    expect(resolved.factionPostures?.Dewanoumi?.posture).toBe("coordinated_pressure");
    const feed = projectNPCAgentActivity(resolved);
    expect(feed.decisions.some((d) => d.category === "faction")).toBe(true);
  });

  it("a foreign recruitment bid surfaces a foreign_signing row", () => {
    const world = withEvents(makeMockWorld({ week: 1, year: 2030 }));
    world.heyas.set(
      "heya-a",
      makeMockHeya("heya-a", { rikishiIds: [], reputation: 60, oyakataId: "o-a", funds: 50_000_000 })
    );
    world.oyakata.set("o-a", MockFactory.createOyakata("o-a", { heyaId: "heya-a" }));
    world.playerHeyaId = "h-player";
    world.talentPool = MockFactory.createTalentPool();
    const foreignCand = MockFactory.createCandidate("fc1", {
      candidateId: "fc1",
      nationality: "Georgia",
      originRegion: "Georgia",
      talentSeed: 80,
      availabilityState: "available",
    });
    world.talentPool.candidates[foreignCand.candidateId] = foreignCand;
    world.talentPool.pools.foreign.candidatesVisible.push(foreignCand.candidateId);

    const impact = fillVacanciesForNPCWithBidding(world, { "heya-a": 1 });
    const resolved = resolveImpacts(world, [impact]);
    const signed = [...resolved.rikishi.values()].some((r) => r.id === foreignCand.personId);
    expect(signed).toBe(true);

    const feed = projectNPCAgentActivity(resolved);
    const row = feed.decisions.find((d) => d.heyaId === "heya-a");
    expect(row?.category).toBe("foreign_signing");
  });

  it("forced succession surfaces a succession row", () => {
    const world = withEvents(MockFactory.createWorld({ week: 10, year: 5 }));
    const oya = MockFactory.createOyakata("o-old", {
      heyaId: "h-npc",
      age: 45,
      tenure: {
        startedYear: 1,
        bashoServed: 20,
        championships: 0,
        sekitoriProduced: 0,
        insolvencyEvents: 5,
        majorScandals: 0,
        forcedMergers: 0,
      },
    });
    const heya = makeMockHeya("h-npc", { oyakataId: "o-old", rikishiIds: ["r-succ"] });
    world.oyakata.set("o-old", oya);
    world.heyas.set("h-npc", heya);
    world.rikishi.set(
      "r-succ",
      MockFactory.createRikishi("r-succ", { heyaId: "h-npc", division: "makuuchi" })
    );
    world.playerHeyaId = "h-player";

    const impact = DynastyService.tickSuccessionCheck(world);
    const resolved = resolveImpacts(world, [impact]);

    const feed = projectNPCAgentActivity(resolved);
    expect(feed.decisions.some((d) => d.category === "succession")).toBe(true);
  });

  it("a grudge-driven escalation surfaces a vendetta row", () => {
    const world = withEvents(makeMockWorld({ week: 10, year: 2030 }));
    const oya = MockFactory.createOyakata("o-a", { heyaId: "h-a", grudges: ["h-b"] });
    world.oyakata.set("o-a", oya);
    world.heyas.set("h-a", makeMockHeya("h-a", { oyakataId: "o-a", funds: 50_000_000 }));
    world.heyas.set("h-b", makeMockHeya("h-b", {}));
    world.playerHeyaId = "h-player";
    world.rivalriesState = {
      version: "1.0.0",
      pairs: {},
      heyaRivalryPairs: {
        "h-a|h-b": { id: "h-a|h-b", heyaAId: "h-a", heyaBId: "h-b", heat: 50, aWins: 3, bWins: 2 },
      },
    } as never;

    // The vendetta flag is set by runAgentLayer when escalation came from a
    // grudge (grudges.test.ts covers the agent side); here we assert the
    // execution → event → feed leg of the chain.
    const decisions = {
      finance: {} as AgentDecisions["finance"],
      governance: {} as AgentDecisions["governance"],
      recruitment: {} as AgentDecisions["recruitment"],
      narrative: {} as AgentDecisions["narrative"],
      rivalry: {
        escalateRivalry: true,
        deescalateRivalry: false,
        targetRivalForMatchmaking: [],
        vendetta: true,
      },
    } as AgentDecisions;

    const impact = executeAgentDecisions(world, "h-a", decisions, oya);
    const resolved = resolveImpacts(world, [impact]);

    const feed = projectNPCAgentActivity(resolved);
    expect(feed.decisions.some((d) => d.category === "vendetta")).toBe(true);
  });
});

describe("WS7 surfacing contract — static wiring", () => {
  it("surfaceEvent handles every canonical WS1–WS6 event shape", () => {
    const src = readSrcFile("presenters/npcAgentProjections.ts");
    for (const marker of [
      "faction_posture",
      "faction_appeal",
      "forced_succession",
      "oyakata_promotion",
      "request_granted",
      "stable_unrest",
      "loan_issued",
      "emergency_sponsor_drive",
      "vendetta",
      "foreign_signing",
      "rikishi_agency",
      "meta_adaptation",
    ]) {
      expect(src, `npcAgentProjections.ts must handle ${marker}`).toContain(marker);
    }
  });

  it("NPCAgentFeed has a label for every emitted category", () => {
    const feed = readSrcFile("components/npc/NPCAgentFeed.tsx");
    for (const category of [
      "meta",
      "succession",
      "faction",
      "vendetta",
      "foreign_signing",
      "rikishi_agency",
      "rescue",
    ]) {
      expect(feed, `NPCAgentFeed must label '${category}'`).toContain(`${category}:`);
    }
  });
});
