import { describe, it, expect } from "vitest";
import { fillVacanciesForNPC } from "@/engine/systems/generation/TalentPoolNPCRecruitment";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya } from "../utils";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { perceivedTalentSeed } from "@/engine/systems/recruitment/perceivedTalent";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";

describe("fillVacanciesForNPC — uses perceived talent for scoring", () => {
  const HEYA_ID = "low-rep-heya" as Id;

  function buildHeyaWorld() {
    const heya = makeMockHeya(HEYA_ID, { reputation: 30, rikishiIds: [] });
    const heyas = new Map([[HEYA_ID, heya]]);
    return makeMockWorld({ heyas, rikishi: new Map(), week: 1 });
  }

  it("uses perceivedTalentSeed for scoring (under-scouted gem escapes affinity penalty)", () => {
    const probeWorld = buildHeyaWorld();

    let gemId: Id | undefined;
    let gemCandidate: TalentCandidate | undefined;
    for (let i = 1; i <= 20; i++) {
      const cId = `gem-c${i}` as Id;
      const candidate = MockFactory.createCandidate(cId, {
        candidateId: cId,
        talentSeed: 95,
        availabilityState: "available",
      });
      const estimate = perceivedTalentSeed(probeWorld, HEYA_ID, candidate);
      if (estimate < 80) {
        gemId = cId;
        gemCandidate = candidate;
        break;
      }
    }
    if (!gemId || !gemCandidate) {
      throw new Error("fixture: no under-scouted gem found — widen candidate set");
    }

    expect(gemCandidate.talentSeed).toBeGreaterThanOrEqual(90);

    const candidates: Record<string, TalentCandidate> = { [gemId]: gemCandidate };
    const visibleIds: string[] = [gemId];
    for (let i = 1; i <= 10; i++) {
      const dId = `decoy-d${i}`;
      candidates[dId] = MockFactory.createCandidate(dId as Id, {
        candidateId: dId as Id,
        talentSeed: 20,
        availabilityState: "available",
      });
      visibleIds.push(dId);
    }

    const pool = MockFactory.createTalentPool({ candidates });
    pool.pools.high_school.candidatesVisible = visibleIds;

    const world = buildHeyaWorld();
    world.talentPool = pool;

    const impact = fillVacanciesForNPC(world, { [HEYA_ID]: 1 });
    const resolved = resolveImpacts(world, [impact]);

    const signedForHeya = Array.from(resolved.rikishi.values()).filter((r) => r.heyaId === HEYA_ID);
    expect(signedForHeya.length).toBe(1);
    expect(signedForHeya[0].id).toBe(gemCandidate.personId);
  });

  it("handles empty vacancy map gracefully", () => {
    const world = buildHeyaWorld();
    const impact = fillVacanciesForNPC(world, {});
    expect(impact).toBeDefined();
  });
});
