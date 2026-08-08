import { describe, it, expect } from "vitest";
import { phase01_daily_micro } from "@/engine/tick/phases/phase01_daily_micro";
import { phase01_daily_economy } from "@/engine/tick/phases/phase01_daily_economy";
import { phase01_daily_welfare } from "@/engine/tick/phases/phase01_daily_welfare";
import { phase01_daily_sponsors } from "@/engine/tick/phases/phase01_daily_sponsors";
import { phase01_daily_drama } from "@/engine/tick/phases/phase01_daily_drama";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("Fused daily micro-phases (B1.3)", () => {
  it("phase01_daily_micro produces same WorldState as running 4 phases sequentially", () => {
    const world1 = generateInitialWorld("fused-daily-seed-001");
    const world2 = generateInitialWorld("fused-daily-seed-001");

    // Sequential: run 4 phases one by one
    const seqImpact1 = phase01_daily_economy(world1);
    const seqWorld1 = resolveImpacts(world1, [seqImpact1]);
    const seqImpact2 = phase01_daily_welfare(seqWorld1);
    const seqWorld2 = resolveImpacts(seqWorld1, [seqImpact2]);
    const seqImpact3 = phase01_daily_sponsors(seqWorld2);
    const seqWorld3 = resolveImpacts(seqWorld2, [seqImpact3]);
    const seqImpact4 = phase01_daily_drama(seqWorld3);
    const seqFinal = resolveImpacts(seqWorld3, [seqImpact4]);

    // Fused: single phase
    const fusedImpact = phase01_daily_micro(world2);
    const fusedFinal = resolveImpacts(world2, [fusedImpact]);

    // Compare key fields
    expect(fusedFinal.dayIndexGlobal).toBe(seqFinal.dayIndexGlobal);
    expect(fusedFinal.cyclePhase).toBe(seqFinal.cyclePhase);
    expect(fusedFinal.calendar).toEqual(seqFinal.calendar);
  });

  it("phase01_daily_micro returns StateImpact (has metadata)", () => {
    const world = generateInitialWorld("fused-daily-seed-002");
    const impact = phase01_daily_micro(world);
    expect(impact).toHaveProperty("metadata");
  });

  it("phase01_daily_micro produces same heya funds as sequential", () => {
    const world1 = generateInitialWorld("fused-daily-seed-003");
    const world2 = generateInitialWorld("fused-daily-seed-003");

    // Sequential
    const seqImpact1 = phase01_daily_economy(world1);
    let seqWorld = resolveImpacts(world1, [seqImpact1]);
    const seqImpact2 = phase01_daily_welfare(seqWorld);
    seqWorld = resolveImpacts(seqWorld, [seqImpact2]);
    const seqImpact3 = phase01_daily_sponsors(seqWorld);
    seqWorld = resolveImpacts(seqWorld, [seqImpact3]);
    const seqImpact4 = phase01_daily_drama(seqWorld);
    const seqFinal = resolveImpacts(seqWorld, [seqImpact4]);

    // Fused
    const fusedImpact = phase01_daily_micro(world2);
    const fusedFinal = resolveImpacts(world2, [fusedImpact]);

    // Compare heya funds
    for (const [id, seqHeya] of seqFinal.heyas) {
      const fusedHeya = fusedFinal.heyas.get(id);
      expect(fusedHeya?.funds).toBe(seqHeya.funds);
    }
  });

  it("phase01_daily_micro produces same sponsor satisfaction as sequential", () => {
    const world1 = generateInitialWorld("fused-daily-seed-004");
    const world2 = generateInitialWorld("fused-daily-seed-004");

    // Sequential
    const seqImpact1 = phase01_daily_economy(world1);
    let seqWorld = resolveImpacts(world1, [seqImpact1]);
    const seqImpact2 = phase01_daily_welfare(seqWorld);
    seqWorld = resolveImpacts(seqWorld, [seqImpact2]);
    const seqImpact3 = phase01_daily_sponsors(seqWorld);
    seqWorld = resolveImpacts(seqWorld, [seqImpact3]);
    const seqImpact4 = phase01_daily_drama(seqWorld);
    const seqFinal = resolveImpacts(seqWorld, [seqImpact4]);

    // Fused
    const fusedImpact = phase01_daily_micro(world2);
    const fusedFinal = resolveImpacts(world2, [fusedImpact]);

    // Compare sponsor satisfaction
    const seqSponsors = seqFinal.sponsorPool?.sponsors;
    const fusedSponsors = fusedFinal.sponsorPool?.sponsors;
    if (seqSponsors && fusedSponsors) {
      for (const [id, seqSponsor] of seqSponsors) {
        const fusedSponsor = fusedSponsors.get(id);
        expect(fusedSponsor?.satisfaction).toBeCloseTo(seqSponsor.satisfaction ?? 0, 5);
      }
    }
  });
});
