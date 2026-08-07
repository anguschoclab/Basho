/**
 * Phase 3b: Lineage & legacy surface regression tests.
 *
 * Proves that BloodlineService, LegacyService, DynastyService, and
 * TrainingPhilosophyService are invoked from their phase call sites
 * and that their effects surface in StablePage, OyakataPage, or HallOfFamePage.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");

function readFile(rel: string): string {
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

describe("BloodlineService — tick phase wiring", () => {
  it("applyHeritageBonus is called by phase01_week_training", () => {
    const phase = readFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("BloodlineService");
    expect(phase).toMatch(/BloodlineService\.applyHeritageBonus/);
  });

  it("exports applyHeritageBonus", () => {
    const svc = readFile("engine/systems/legacy/BloodlineService.ts");
    expect(svc).toContain("applyHeritageBonus");
  });
});

describe("LegacyService — call site wiring", () => {
  it("registerLegacyTrait is called by CareerService on retirement", () => {
    const svc = readFile("engine/lifecycle/CareerService.ts");
    expect(svc).toContain("LegacyService");
    expect(svc).toMatch(/LegacyService\.registerLegacyTrait/);
  });

  it("registerLegacyTrait is also called by governanceReview", () => {
    const gr = readFile("engine/systems/governance/governanceReview.ts");
    expect(gr).toContain("LegacyService");
    expect(gr).toMatch(/LegacyService\.registerLegacyTrait/);
  });

  it("rollLegacyAncestry is called by CandidateGenerator", () => {
    const cg = readFile("engine/systems/generation/CandidateGenerator.ts");
    expect(cg).toContain("LegacyService");
    expect(cg).toMatch(/LegacyService\.rollLegacyAncestry/);
  });

  it("exports registerLegacyTrait and rollLegacyAncestry", () => {
    const svc = readFile("engine/systems/legacy/LegacyService.ts");
    expect(svc).toContain("registerLegacyTrait");
    expect(svc).toContain("rollLegacyAncestry");
  });
});

describe("DynastyService — tick phase wiring", () => {
  it("tickSuccessionCheck is called by phase06_yearly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("DynastyService");
    expect(phase).toMatch(/DynastyService\.tickSuccessionCheck/);
  });

  it("exports tickSuccessionCheck", () => {
    const svc = readFile("engine/systems/legacy/DynastyService.ts");
    expect(svc).toContain("tickSuccessionCheck");
  });
});

describe("TrainingPhilosophyService — tick phase wiring", () => {
  it("tickPhilosophyDrift is called by phase06_yearly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("TrainingPhilosophyService");
    expect(phase).toMatch(/TrainingPhilosophyService\.tickPhilosophyDrift/);
  });

  it("exports tickPhilosophyDrift", () => {
    const svc = readFile("engine/systems/legacy/TrainingPhilosophyService.ts");
    expect(svc).toContain("tickPhilosophyDrift");
  });
});

describe("StablePage — legacy UI surface", () => {
  it("mounts MentorAssignmentPanel for mentor/apprentice wiring", () => {
    const page = readFile("pages/StablePage.tsx");
    expect(page).toContain("MentorAssignmentPanel");
  });

  it("mounts ChronicleRoom for stable history", () => {
    const page = readFile("pages/StablePage.tsx");
    expect(page).toContain("ChronicleRoom");
  });
});

describe("OyakataPage — legacy UI surface", () => {
  it("renders oyakata traits and profile", () => {
    const page = readFile("pages/OyakataPage.tsx");
    expect(page).toContain("TRAIT_LABELS");
    expect(page).toContain("toTraitBand");
  });

  it("uses menteesOf from lineage module", () => {
    const page = readFile("pages/OyakataPage.tsx");
    expect(page).toContain("menteesOf");
  });
});
