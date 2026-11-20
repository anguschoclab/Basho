import { describe, it, expect } from "vitest";
import {
  conveneRikishiCouncil,
  electRikishiCouncilDelegates,
  hasActiveCouncilPolicy,
  proposeCouncilMotion,
  voteCouncilMotion,
} from "@/engine/governance/services/RikishiCouncilService";
import { phase01_week_governance } from "@/engine/tick/phases/phase01_week_governance";
import { phase01_week_welfare } from "@/engine/tick/phases/phase01_week_welfare";
import { phase01_week_health } from "@/engine/tick/phases/phase01_week_health";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

function buildCouncilWorld(): WorldState {
  const world = makeMockWorld({
    seed: "rikishi-council-seed",
    year: 2027,
    week: 12,
    cyclePhase: "post_basho",
    playerHeyaId: "heya-1",
  });

  const h1 = makeMockHeya("heya-1", { politicalCapital: 50, rikishiIds: ["y-1", "m-1", "j-1"] });
  const h2 = makeMockHeya("heya-2", { politicalCapital: 50, rikishiIds: ["o-1", "m-2", "j-2"] });
  const h3 = makeMockHeya("heya-3", { politicalCapital: 50, rikishiIds: ["jk-1"] });
  world.heyas.set(h1.id, h1);
  world.heyas.set(h2.id, h2);
  world.heyas.set(h3.id, h3);

  const roster: Rikishi[] = [
    mockRikishi("y-1", {
      heyaId: "heya-1",
      division: "makuuchi",
      rank: "yokozuna",
      rankNumber: 1,
      side: "east",
      careerWins: 400,
    }),
    mockRikishi("o-1", {
      heyaId: "heya-2",
      division: "makuuchi",
      rank: "ozeki",
      rankNumber: 1,
      side: "west",
      careerWins: 300,
    }),
    mockRikishi("m-1", {
      heyaId: "heya-1",
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 1,
      side: "east",
    }),
    mockRikishi("m-2", {
      heyaId: "heya-2",
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 2,
      side: "west",
    }),
    mockRikishi("j-1", {
      heyaId: "heya-1",
      division: "juryo",
      rank: "juryo",
      rankNumber: 1,
      side: "east",
    }),
    mockRikishi("j-2", {
      heyaId: "heya-2",
      division: "juryo",
      rank: "juryo",
      rankNumber: 2,
      side: "west",
    }),
    mockRikishi("jk-1", {
      heyaId: "heya-3",
      division: "jonokuchi",
      rank: "jonokuchi",
      rankNumber: 5,
      side: "east",
    }),
  ];

  for (const r of roster) {
    world.rikishi.set(r.id, r);
    world.activeRikishiIds.add(r.id);
  }
  return world;
}

describe("§3 Rikishi-kai / Rikishi-ken (力士会, Wrestlers' Council)", () => {
  it("elects the senior Yokozuna as Kaichō with Makuuchi and Juryo representatives", () => {
    const world = buildCouncilWorld();
    const { kaichoId, delegates } = electRikishiCouncilDelegates(world);

    expect(kaichoId).toBe("y-1");
    expect(delegates[0]).toMatchObject({
      rikishiId: "y-1",
      role: "kaicho",
      division: "makuuchi",
    });
    expect(delegates.filter((d) => d.role === "makuuchi_rep")).toHaveLength(3);
    expect(delegates.filter((d) => d.role === "juryo_rep")).toHaveLength(2);
    expect(delegates.some((d) => d.rikishiId === "jk-1")).toBe(false);
  });

  it("allows only sekitori-represented stables to propose motions, records player votes, and deliberates via RIKISHI_COUNCIL_COMMITTEE", () => {
    let world = buildCouncilWorld();

    // heya-3 has only jonokuchi rikishi — cannot propose a Rikishi-kai motion.
    const rejectedProposal = proposeCouncilMotion(world, "heya-3", "dohyo_safety");
    expect(rejectedProposal.worldFields?.rikishiCouncil).toBeUndefined();

    // heya-1 (player, has sekitori) proposes dohyo_safety and welfare_standards.
    world = resolveImpacts(world, [proposeCouncilMotion(world, "heya-1", "dohyo_safety")]);
    world = resolveImpacts(world, [proposeCouncilMotion(world, "heya-1", "welfare_standards")]);
    expect(world.rikishiCouncil?.pendingMotions).toHaveLength(2);

    const motionId = world.rikishiCouncil!.pendingMotions[0].id;
    world = resolveImpacts(world, [voteCouncilMotion(world, motionId, "for")]);
    expect(world.rikishiCouncil?.pendingMotions[0].playerVote).toBe("for");

    // Convene session: motions pass and activate policies.
    world = resolveImpacts(world, [conveneRikishiCouncil(world)]);
    expect(world.rikishiCouncil?.pendingMotions).toHaveLength(0);
    expect(world.rikishiCouncil?.history).toHaveLength(2);
    expect(hasActiveCouncilPolicy(world, "dohyo_safety")).toBe(true);
    expect(hasActiveCouncilPolicy(world, "welfare_standards")).toBe(true);
  });

  it("wires active Rikishi-kai policies into post-basho governance, welfare morale, and health recovery", () => {
    let world = buildCouncilWorld();
    world = resolveImpacts(world, [proposeCouncilMotion(world, "heya-1", "benefit_relief")]);

    // phase01_week_governance during post_basho convenes Rikishi-kai and grants political capital on benefit_relief.
    world = resolveImpacts(world, [phase01_week_governance(world)]);
    expect(world.rikishiCouncil?.history.length).toBeGreaterThanOrEqual(1);
    expect(world.heyas.get("heya-1")?.politicalCapital).toBeGreaterThanOrEqual(52);

    // Activate welfare_standards and verify phase01_week_welfare applies the +3 morale charter bonus.
    const baselineWorld: WorldState = {
      ...world,
      rikishiCouncil: { ...world.rikishiCouncil!, activePolicies: [] },
    };
    const charterWorld: WorldState = {
      ...world,
      rikishiCouncil: {
        ...world.rikishiCouncil!,
        activePolicies: ["welfare_standards", "dohyo_safety"],
      },
    };
    const baseWelfare = resolveImpacts(baselineWorld, [phase01_week_welfare(baselineWorld)]);
    const charterWelfare = resolveImpacts(charterWorld, [phase01_week_welfare(charterWorld)]);
    expect(charterWelfare.heyas.get("heya-1")?.welfareState?.morale).toBeGreaterThan(
      baseWelfare.heyas.get("heya-1")?.welfareState?.morale ?? 0
    );

    // Injured rikishi recovers cleanly under active dohyo_safety protocol.
    const hurt = {
      ...charterWorld.rikishi.get("m-1")!,
      injured: true,
      injuryWeeksRemaining: 1,
    };
    charterWorld.rikishi.set("m-1", hurt);
    const healed = resolveImpacts(charterWorld, [phase01_week_health(charterWorld)]);
    expect(healed.rikishi.get("m-1")?.injured).toBe(false);
  });
});
