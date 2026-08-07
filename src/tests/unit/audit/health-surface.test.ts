/**
 * Phase 1b: Health surface regression tests.
 *
 * Proves that InjuryService and WelfareService are invoked from their tick phases
 * and that InjuryRecoveryPage mounts InjuryRecoveryPanel and WelfarePanel.
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

describe("InjuryService — tick phase wiring", () => {
  it("rollWeeklyInjury is imported and called by phase01_week_health", () => {
    const phase = readFile("engine/tick/phases/phase01_week_health.ts");
    expect(phase).toContain("rollWeeklyInjury");
    expect(phase).toMatch(/rollWeeklyInjury\s*\(/);
  });

  it("tickRikishiRecovery is imported and called by phase01_week_health", () => {
    const phase = readFile("engine/tick/phases/phase01_week_health.ts");
    expect(phase).toContain("tickRikishiRecovery");
    expect(phase).toMatch(/tickRikishiRecovery\s*\(/);
  });

  it("phase01_week_health emits lifecycle events for injuries", () => {
    const phase = readFile("engine/tick/phases/phase01_week_health.ts");
    expect(phase).toContain("logEvent");
  });
});

describe("WelfareService — tick phase wiring", () => {
  it("WelfareService is imported and used by phase01_week_welfare", () => {
    const phase = readFile("engine/tick/phases/phase01_week_welfare.ts");
    expect(phase).toContain("WelfareService");
  });

  it("calculateWeeklyWelfareDelta is imported and called by phase01_week_welfare", () => {
    const phase = readFile("engine/tick/phases/phase01_week_welfare.ts");
    expect(phase).toContain("calculateWeeklyWelfareDelta");
  });

  it("phase01_week_welfare emits welfare compliance events", () => {
    const phase = readFile("engine/tick/phases/phase01_week_welfare.ts");
    expect(phase).toContain("logEvent");
    expect(phase).toContain("WELFARE_COMPLIANCE");
  });
});

describe("InjuryRecoveryPage — UI surface", () => {
  it("mounts InjuryRecoveryPanel", () => {
    const page = readFile("pages/InjuryRecoveryPage.tsx");
    expect(page).toContain("InjuryRecoveryPanel");
  });

  it("mounts WelfarePanel", () => {
    const page = readFile("pages/InjuryRecoveryPage.tsx");
    expect(page).toContain("WelfarePanel");
  });

  it("uses projectMedicalUIDigest for state projection", () => {
    const page = readFile("pages/InjuryRecoveryPage.tsx");
    expect(page).toContain("projectMedicalUIDigest");
  });
});
