/**
 * Phase 1a: Economy surface regression tests.
 *
 * Proves that MochikyukinService, InfrastructureService, SponsorContractService,
 * and TravelAllowanceService are invoked from their tick phases and that
 * EconomyPage / FacilitiesPage render fields those services mutate.
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

// ─── Tick phase call site proofs ─────────────────────────────────────────────

describe("MochikyukinService — tick phase wiring", () => {
  it("payMochikyukinBonuses is imported and called by phase05_monthly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    expect(phase).toContain("payMochikyukinBonuses");
    expect(phase).toMatch(/payMochikyukinBonuses\s*\(/);
  });

  it("accumulateMochikyukinPoints is exported and reachable", () => {
    const svc = readFile("engine/systems/economy/MochikyukinService.ts");
    expect(svc).toContain("export function accumulateMochikyukinPoints");
    expect(svc).toContain("export function payMochikyukinBonuses");
  });
});

describe("InfrastructureService — tick phase wiring", () => {
  it("processCompletionTick is imported and called by phase06_yearly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("InfrastructureService");
    expect(phase).toMatch(/InfrastructureService\.processCompletionTick\s*\(/);
  });

  it("startConstruction is exported and used by FacilitiesPage", () => {
    const svc = readFile("engine/systems/economy/InfrastructureService.ts");
    expect(svc).toContain("startConstruction");
    expect(svc).toContain("processCompletionTick");
    expect(svc).toContain("getHeyaBonuses");
  });
});

describe("SponsorContractService — tick phase wiring", () => {
  it("renewSponsorContract is imported and called by phase05_monthly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    expect(phase).toContain("renewSponsorContract");
    expect(phase).toMatch(/renewSponsorContract\s*\(/);
  });

  it("renewSponsorContract is exported", () => {
    const svc = readFile("engine/systems/economy/SponsorContractService.ts");
    expect(svc).toContain("export function renewSponsorContract");
  });
});

describe("TravelAllowanceService — tick phase wiring", () => {
  it("payTravelAllowance is imported and called by phase05_monthly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    expect(phase).toContain("payTravelAllowance");
    expect(phase).toMatch(/payTravelAllowance\s*\(/);
  });

  it("deductTsukebitoCosts is imported and called by phase05_monthly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    expect(phase).toContain("deductTsukebitoCosts");
    expect(phase).toMatch(/deductTsukebitoCosts\s*\(/);
  });

  it("distributeKoenkaiToSekitori is imported and called by phase05_monthly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    expect(phase).toContain("distributeKoenkaiToSekitori");
    expect(phase).toMatch(/distributeKoenkaiToSekitori\s*\(/);
  });
});

// ─── UI surface proofs ───────────────────────────────────────────────────────

describe("EconomyPage — renders economy fields", () => {
  it("renders funds, runwayBand, and sponsor panel", () => {
    const page = readFile("pages/EconomyPage.tsx");
    expect(page).toContain("playerHeya.funds");
    expect(page).toContain("runwayBand");
    expect(page).toContain("SponsorsPanel");
    expect(page).toContain("FinancialHealthOverview");
  });

  it("renders weekly finances via calculateHeyaWeeklyFinances", () => {
    const page = readFile("pages/EconomyPage.tsx");
    expect(page).toContain("calculateHeyaWeeklyFinances");
    expect(page).toContain("IncomeExpensesCards");
  });
});

describe("FacilitiesPage — renders infrastructure fields", () => {
  it("renders FacilitiesManagementPanel and InfrastructurePanel", () => {
    const page = readFile("pages/FacilitiesPage.tsx");
    expect(page).toContain("FacilitiesManagementPanel");
    expect(page).toContain("InfrastructurePanel");
    expect(page).toContain("investInFacility");
  });

  it("calls InfrastructureService via buildInfrastructure", () => {
    const page = readFile("pages/FacilitiesPage.tsx");
    expect(page).toContain("buildInfrastructure");
    expect(page).toContain("handleBuildInfrastructure");
  });
});

// ─── Selector / presenter reachability ───────────────────────────────────────

describe("Economy selectors — state field reachability", () => {
  it("getStableFinances reads heya.funds and economy fields", () => {
    const selectors = readFile("engine/selectors.ts");
    expect(selectors).toContain("getStableFinances");
    expect(selectors).toMatch(/\.funds/);
  });

  it("projectHeyaData surfaces economy data for InstitutionPanel", () => {
    const proj = readFile("presenters/projections/heyaProjections.ts");
    expect(proj).toContain("projectHeyaData");
  });
});
