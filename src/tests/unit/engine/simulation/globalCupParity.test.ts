import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { GlobalCupService } from "@/engine/systems/economy/GlobalCupService";
import { TalentPoolService } from "@/engine/systems/generation/TalentPoolService";

describe("Global Cup & Talent Pool Parity", () => {
  it("SHOULD pick challengers from the talent pool if available", () => {
    const world = generateInitialWorld("test-seed-gc");

    // Inject a specific foreign candidate
    const foreignCandidateId = "cd_mongolian_beast";
    world.talentPool = TalentPoolService.ensureTalentPoolState(world);
    world.talentPool.candidates[foreignCandidateId] = {
      candidateId: foreignCandidateId,
      name: "Mongolian Beast",
      nationality: "Mongolia",
      talentSeed: 99,
      availabilityState: "available",
      birthYear: world.year - 22,
    } as any;

    const participants = GlobalCupService.selectParticipants(world);
    const challenger = participants.find((p) => p.isChallenger && p.nationality === "Mongolia");

    expect(challenger).toBeDefined();
    expect(challenger?.rikishiId).toBe(foreignCandidateId);
    expect(challenger?.shikona).toBe("Mongolian Beast");
  });

  it("SHOULD fallback to generated challengers if talent pool is empty", () => {
    const world = generateInitialWorld("test-seed-gc-fallback");
    // Ensure no foreign candidates
    world.talentPool = { candidates: {} } as any;

    const participants = GlobalCupService.selectParticipants(world);
    const challengers = participants.filter((p) => p.isChallenger);

    expect(challengers.length).toBe(2);
    expect(challengers[0].rikishiId).toContain("challenger");
  });
});
