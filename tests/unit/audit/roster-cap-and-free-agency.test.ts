/**
 * Roster-cap & free-agency removal audit — real JSA has no per-heya roster cap,
 * and a rikishi who leaves a stable retires (no free agency). The game's
 * hard-cap release enforcer and priorCareer re-entry machinery are removed;
 * these tests pin that they stay gone.
 */
import { describe, it, expect } from "vitest";
import { readSrcFile } from "@tests/helpers/fsScan";

describe("roster cap removal", () => {
  it("the weekly NPC phase no longer enforces a hard roster cap", () => {
    const src = readSrcFile("engine/tick/phases/phase01_week_npc_ai.ts");
    expect(src).not.toContain("enforceHardCapRosterOverflow");
  });

  it("roster constants no longer export hard-cap values", () => {
    const src = readSrcFile("constants/engine/roster.ts");
    expect(src).not.toContain("ROSTER_CAPACITY_STANDARD");
    expect(src).not.toContain("ROSTER_CAPACITY_MERGER");
    expect(src).not.toContain("HEYA_ROSTER_HARD_CAP");
  });

  it("no source file enforces a hard roster cap anymore", () => {
    const overflow = readSrcFile("engine/recruitment/overflow.ts");
    expect(overflow).not.toContain("HARD_CAP_ROSTER_SIZE");
  });
});

describe("free agency removal", () => {
  it("TalentPoolStateService no longer reinjects released rikishi", () => {
    const src = readSrcFile("engine/generation/TalentPoolStateService.ts");
    expect(src).not.toContain("reinjectToTalentPool");
    expect(src).not.toContain("reinjectManyToTalentPool");
    expect(src).not.toContain("priorCareer");
  });

  it("TalentCandidate no longer carries a priorCareer free-agent record", () => {
    const src = readSrcFile("engine/types/talent.ts");
    expect(src).not.toContain("priorCareer");
    expect(src).not.toContain("PriorCareer");
  });

  it("CandidateBuilder no longer re-mints released veterans", () => {
    const src = readSrcFile("engine/generation/CandidateBuilder.ts");
    expect(src).not.toContain("priorCareer");
  });
});
