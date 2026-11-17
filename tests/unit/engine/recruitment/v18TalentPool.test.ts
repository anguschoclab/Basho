/**
 * v18TalentPool.test.ts
 * ======================
 * Failing-first regression pins for the S7 talent-pool audit findings.
 *
 * NOTE: the reinject/free-agent and hard-cap overflow pins were removed —
 * the JSA has no roster cap and no free agency, so that machinery was
 * deleted rather than fixed (A10/A11).
 *
 *  - S7-42/43: `CandidateGenerator` (src/engine/generation/CandidateGenerator.ts:217-221)
 *    rolls `rng.next() > AMATEUR_STAR_TAG_CHANCE` (≈20%) while the constant
 *    documents an 0.8 chance, and never sets `TalentCandidate.isAmateurStar`,
 *    leaving its readers (src/engine/npc/eventSurfacing.ts:34,
 *    src/pages/CandidatePoolPage.tsx:80) dead.
 *
 *  - S7 prodigy: `convertCandidateToRikishi` (src/engine/generation/CandidateBuilder.ts:363-447)
 *    never propagates `candidate.isEmergentProdigy` — the burnout gate in
 *    weeklyTraining.ts:156 (`rikishi.injuryStatus?.isEmergentProdigy`) is dead code.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { convertCandidateToRikishi } from "@/engine/generation/CandidateBuilder";
import { generateCandidate } from "@/engine/generation/CandidateGenerator";
import { AMATEUR_STAR_TAG_CHANCE } from "@/constants/engine/generation";
import { rngFromSeed } from "@/engine/core/rng";
import type { Id } from "@/engine/types/common";

const YEAR = 2030;
const HEYA = "h-buyer" as Id;

// ── amateur star tag rate + isAmateurStar flag ──────────────────────────────

describe("CandidateGenerator amateur-star tagging (S7-42/43)", () => {
  it("the amateur_star tag rate approximates the documented AMATEUR_STAR_TAG_CHANCE", () => {
    const rng = rngFromSeed("v18-amateur", "generation", "amateur-star-rate");
    const N = 300;
    let stars = 0;
    for (let i = 0; i < N; i++) {
      const c = generateCandidate({
        id: `am-${i}`,
        rng,
        currentYear: YEAR,
        poolType: "high_school",
      });
      if (c.tags.includes("amateur_star")) stars++;
    }
    const rate = stars / N;
    // PIN (RED): rng.next() > 0.8 yields ~20% stars, not the documented 80%.
    expect(Math.abs(rate - AMATEUR_STAR_TAG_CHANCE)).toBeLessThan(0.2);
  });

  it("generated amateur-star candidates carry the isAmateurStar flag their readers check", () => {
    const rng = rngFromSeed("v18-amateur", "generation", "amateur-star-flag");
    let starred: import("@/engine/types/talent").TalentCandidate | undefined;
    for (let i = 0; i < 100 && !starred; i++) {
      const c = generateCandidate({
        id: `amf-${i}`,
        rng,
        currentYear: YEAR,
        poolType: "high_school",
      });
      if (c.tags.includes("amateur_star")) starred = c;
    }
    expect(starred).toBeDefined();
    // PIN (RED): TalentCandidate.isAmateurStar is never set — eventSurfacing.ts:34
    // and CandidatePoolPage.tsx:80 read a dead field.
    expect(starred?.isAmateurStar).toBe(true);
  });
});

// ── emergent prodigy flag propagation ───────────────────────────────────────

describe("convertCandidateToRikishi — emergent prodigy flag", () => {
  it("propagates isEmergentProdigy so the weeklyTraining burnout gate can fire", () => {
    const candidate = MockFactory.createCandidate("prod-1", {
      isEmergentProdigy: true,
    });
    const rikishi = convertCandidateToRikishi({
      candidate,
      rng: rngFromSeed("v18-prodigy", "generation", "prodigy"),
      currentYear: YEAR,
      heyaId: HEYA,
    });

    // PIN (RED): the flag never reaches the rikishi — applyProdigyBurnout
    // (weeklyTraining.ts:156) gates on rikishi.injuryStatus?.isEmergentProdigy,
    // which stays undefined for every converted recruit.
    expect(rikishi.injuryStatus?.isEmergentProdigy).toBe(true);
  });
});
