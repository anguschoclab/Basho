/**
 * Phase 3b: Lineage & legacy surface regression tests.
 *
 * Proves that BloodlineService, LegacyService, DynastyService, and
 * TrainingPhilosophyService are invoked from their phase call sites
 * and that their effects surface in StablePage, OyakataPage, or HallOfFamePage.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("BloodlineService — tick phase wiring", () => {
  it("applyHeritageBonus is called by phase01_week_training", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("BloodlineService");
    expect(phase).toMatch(/BloodlineService\.applyHeritageBonus/);
  });

  it("exports applyHeritageBonus", () => {
    const svc = readSrcFile("engine/systems/legacy/BloodlineService.ts");
    expect(svc).toContain("applyHeritageBonus");
  });
});

describe("LegacyService — call site wiring", () => {
  it("registerLegacyTrait is called by CareerService on retirement", () => {
    const svc = readSrcFile("engine/lifecycle/CareerService.ts");
    expect(svc).toContain("LegacyService");
    expect(svc).toMatch(/LegacyService\.registerLegacyTrait/);
  });

  it("registerLegacyTrait is also called by governanceReview", () => {
    const gr = readSrcFile("engine/systems/governance/governanceReview.ts");
    expect(gr).toContain("LegacyService");
    expect(gr).toMatch(/LegacyService\.registerLegacyTrait/);
  });

  it("rollLegacyAncestry is called by CandidateGenerator", () => {
    const cg = readSrcFile("engine/systems/generation/CandidateGenerator.ts");
    expect(cg).toContain("LegacyService");
    expect(cg).toMatch(/LegacyService\.rollLegacyAncestry/);
  });

  it("exports registerLegacyTrait and rollLegacyAncestry", () => {
    const svc = readSrcFile("engine/systems/legacy/LegacyService.ts");
    expect(svc).toContain("registerLegacyTrait");
    expect(svc).toContain("rollLegacyAncestry");
  });
});

describe("DynastyService — tick phase wiring", () => {
  it("tickSuccessionCheck is called by phase06_yearly_boundary", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("DynastyService");
    expect(phase).toMatch(/DynastyService\.tickSuccessionCheck/);
  });

  it("exports tickSuccessionCheck", () => {
    const svc = readSrcFile("engine/systems/legacy/DynastyService.ts");
    expect(svc).toContain("tickSuccessionCheck");
  });
});

describe("TrainingPhilosophyService — tick phase wiring", () => {
  it("tickPhilosophyDrift is called by phase06_yearly_boundary", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("TrainingPhilosophyService");
    expect(phase).toMatch(/TrainingPhilosophyService\.tickPhilosophyDrift/);
  });

  it("exports tickPhilosophyDrift", () => {
    const svc = readSrcFile("engine/systems/legacy/TrainingPhilosophyService.ts");
    expect(svc).toContain("tickPhilosophyDrift");
  });
});

describe("StablePage — legacy UI surface", () => {
  it("mounts MentorAssignmentPanel for mentor/apprentice wiring", () => {
    const page = readSrcFile("pages/StablePage.tsx");
    expect(page).toContain("MentorAssignmentPanel");
  });

  it("mounts ChronicleRoom for stable history", () => {
    const page = readSrcFile("pages/StablePage.tsx");
    expect(page).toContain("ChronicleRoom");
  });
});

describe("OyakataPage — legacy UI surface", () => {
  it("renders oyakata traits and profile", () => {
    const page = readSrcFile("pages/OyakataPage.tsx");
    expect(page).toContain("TRAIT_LABELS");
    expect(page).toContain("toTraitBand");
  });

  it("uses menteesOf from lineage module", () => {
    const page = readSrcFile("pages/OyakataPage.tsx");
    expect(page).toContain("menteesOf");
  });
});
