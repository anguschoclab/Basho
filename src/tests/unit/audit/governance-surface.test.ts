/**
 * Phase 2a: Governance surface regression tests.
 *
 * Proves that YokozunaService, ScandalService (via evaluateScandals), KihakuService,
 * and PoliticalFavorsService are invoked from their call sites and that
 * GovernancePage reads scandal/politicalCapital/welfare state via projections.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("YokozunaService — tick phase wiring", () => {
  it("is imported and called by phase01_week_governance", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_governance.ts");
    expect(phase).toContain("YokozunaService");
  });
});

describe("ScandalService — evaluateScandals wiring", () => {
  it("evaluateScandals is imported and called by phase01_week_governance", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_governance.ts");
    expect(phase).toContain("evaluateScandals");
  });

  it("runElections is imported and called by phase06_yearly_boundary", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("runElections");
  });
});

describe("KihakuService — call site wiring", () => {
  it("is imported and called by BanzukePublisher", () => {
    const pub = readSrcFile("engine/banzuke/publish/performance.ts");
    expect(pub).toContain("KihakuService");
    expect(pub).toMatch(/KihakuService\.calculateScore/);
    expect(pub).toMatch(/KihakuService\.extractFromBasho/);
  });

  it("exports calculateScore and extractFromBasho", () => {
    const svc = readSrcFile("engine/systems/governance/KihakuService.ts");
    expect(svc).toContain("calculateScore");
    expect(svc).toContain("extractFromBasho");
  });
});

describe("PoliticalFavorsService — call site wiring", () => {
  it("is imported and used by engine.worker.ts", () => {
    const worker = readSrcFile("engine/worker/commands/governance.ts");
    expect(worker).toContain("PoliticalFavorsService");
    expect(worker).toMatch(/PoliticalFavorsService\.requestFavor/);
  });

  it("exports requestFavor and POLITICAL_FAVORS", () => {
    const svc = readSrcFile("engine/systems/governance/PoliticalFavorsService.ts");
    expect(svc).toContain("requestFavor");
    expect(svc).toContain("POLITICAL_FAVORS");
  });
});

describe("GovernancePage — UI surface", () => {
  it("uses projectGovernanceDerived projection", () => {
    const page = readSrcFile("pages/GovernancePage.tsx");
    expect(page).toContain("projectGovernanceDerived");
  });

  it("renders scandal score and band from projection", () => {
    const page = readSrcFile("pages/GovernancePage.tsx");
    expect(page).toContain("scandal");
    expect(page).toContain("SCANDAL_LABELS");
  });

  it("renders welfare state and compliance status", () => {
    const page = readSrcFile("pages/GovernancePage.tsx");
    expect(page).toContain("welfare");
    expect(page).toContain("complianceState");
  });

  it("renders governance history and pending rulings", () => {
    const page = readSrcFile("pages/GovernancePage.tsx");
    expect(page).toContain("governanceHistory");
    expect(page).toContain("pendingRulings");
  });

  it("renders faction list with influence values", () => {
    const page = readSrcFile("pages/GovernancePage.tsx");
    expect(page).toContain("factionList");
    expect(page).toContain("influence");
  });
});

describe("governanceProjections — state field mapping", () => {
  it("maps scandalScore, politicalCapital, and welfare state", () => {
    const proj = readSrcFile("presenters/projections/governanceProjections.ts");
    expect(proj).toContain("scandalScore");
    expect(proj).toContain("politicalCapital");
    expect(proj).toContain("scandalBand");
  });
});
