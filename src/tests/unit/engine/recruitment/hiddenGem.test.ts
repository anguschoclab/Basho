import { describe, it, expect } from "vitest";
import { fillVacanciesForNPC } from "@/engine/systems/generation/TalentPoolNPCRecruitment";
import { perceivedTalentSeed } from "@/engine/systems/recruitment/perceivedTalent";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya } from "../utils";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Id } from "@/engine/types/common";

// The true-talent affinity gate in fillVacanciesForNPC (pre-fix) makes a TRUE-90+
// prospect almost unsignable by a low-reputation stable: talent>=80 && rep<70 => *0.1,
// talent>=90 && rep<85 => *0.05. That is a second dynasty concentrator (the first was
// bidding, fixed in a prior task) — genuine gems can never land in a small stable.
//
// Fix: score/gate off the stable's scouted ESTIMATE (perceivedTalentSeed), not the
// truth. A candidate the stable happens to under-scout (estimate < 80) escapes the
// affinity penalty entirely, even though their TRUE talent is elite — that's the
// "hidden gem" mechanism this test proves.
describe("hidden gems: backfill path signs a high-TRUE-talent candidate into a low-reputation stable", () => {
  const HEYA_ID = "low-rep-heya" as Id;

  function buildHeyaWorld() {
    const heya = makeMockHeya(HEYA_ID, { reputation: 30, rikishiIds: [] });
    const heyas = new Map([[HEYA_ID, heya]]);
    return makeMockWorld({ heyas, rikishi: new Map(), week: 1 });
  }

  it("signs an under-scouted TRUE-95-talent candidate that the true-talent gate would reject", () => {
    const probeWorld = buildHeyaWorld();

    // Twenty TRUE-talent-95 candidates. Under the OLD true-talent gate every one of them
    // gets squashed identically (talent>=90 && rep<85 => affinity 0.05) regardless of
    // which one we pick here, so which specific candidate we search over doesn't matter
    // for the pre-fix comparison -- what matters is finding ONE this stable happens to
    // under-scout (estimate < 80), so post-fix it escapes the affinity penalty entirely.
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

    // Sanity: this is a genuine TRUE-talent gem, not a mediocre prospect.
    expect(gemCandidate.talentSeed).toBeGreaterThanOrEqual(90);

    // Ten decoy candidates with low TRUE talent (20) -- under the true-talent gate they
    // face no affinity penalty at all (talent < 80), so they reliably outscore the
    // squashed true-talent gem. Under the fixed estimate-based gate, the gem's escaped
    // affinity (1.0, scored on an estimate in the 70s) comfortably outscores decoys
    // scored on their own (~20-ish) estimate.
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

    // Candidates materialize to rikishi using candidate.personId as the rikishi id
    // (see convertCandidateToRikishi / createBaseInfo).
    expect(signedForHeya[0].id).toBe(gemCandidate.personId);
  });
});
