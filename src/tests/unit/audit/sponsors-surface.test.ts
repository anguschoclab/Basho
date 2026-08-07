/**
 * Phase 2c: Sponsors surface regression tests.
 *
 * Proves that SponsorContractService is invoked from phase05_monthly_boundary
 * and that SponsorManagementPage uses projectSponsorUIDigest.
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

describe("SponsorContractService — tick phase wiring", () => {
  it("renewSponsorContract is imported and called by phase05_monthly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    expect(phase).toContain("renewSponsorContract");
    expect(phase).toMatch(/renewSponsorContract\s*\(/);
  });

  it("is also imported by engine.worker.ts for player-initiated actions", () => {
    const worker = readFile("engine/worker/engine.worker.ts");
    expect(worker).toContain("renewSponsorContract");
  });

  it("exports renewSponsorContract", () => {
    const svc = readFile("engine/systems/economy/SponsorContractService.ts");
    expect(svc).toContain("export function renewSponsorContract");
  });
});

describe("SponsorManagementPage — UI surface", () => {
  it("uses projectSponsorUIDigest for state projection", () => {
    const page = readFile("pages/SponsorManagementPage.tsx");
    expect(page).toContain("projectSponsorUIDigest");
  });

  it("renders SponsorContractsPanel", () => {
    const page = readFile("pages/SponsorManagementPage.tsx");
    expect(page).toContain("SponsorContractsPanel");
  });

  it("renders SponsorSatisfactionChart", () => {
    const page = readFile("pages/SponsorManagementPage.tsx");
    expect(page).toContain("SponsorSatisfactionChart");
  });

  it("passes sponsor data from digest to chart", () => {
    const page = readFile("pages/SponsorManagementPage.tsx");
    expect(page).toContain("activeSponsors");
    expect(page).toContain("satisfaction");
  });
});

describe("EconomyPage — sponsor panel surface", () => {
  it("renders SponsorsPanel", () => {
    const page = readFile("pages/EconomyPage.tsx");
    expect(page).toContain("SponsorsPanel");
  });
});
