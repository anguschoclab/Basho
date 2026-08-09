/**
 * Dead-service wiring proof tests.
 *
 * Proves that the 5 previously-dead services are imported and called
 * from their appropriate tick phases / bout resolver / competition service.
 * Follows the economy-surface.test.ts pattern.
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

// ─── GyojiService → boutResolver.ts ──────────────────────────────────────────

describe("GyojiService — bout resolver wiring", () => {
  it("assignGyojiToBout is imported and called by boutResolver", () => {
    const file = readFile("engine/bout/boutResolver.ts");
    expect(file).toContain("assignGyojiToBout");
    expect(file).toMatch(/assignGyojiToBout\s*\(/);
  });

  it("recordGyojiBout is imported and called by boutResolver", () => {
    const file = readFile("engine/bout/boutResolver.ts");
    expect(file).toContain("recordGyojiBout");
    expect(file).toMatch(/recordGyojiBout\s*\(/);
  });

  it("GyojiService is imported from the correct path", () => {
    const file = readFile("engine/bout/boutResolver.ts");
    expect(file).toMatch(/from\s+["'].*GyojiService["']/);
  });
});

// ─── GomenfudaService → phase01_week_health.ts ───────────────────────────────

describe("GomenfudaService — health phase wiring", () => {
  it("recordGomenfuda is imported and called by phase01_week_health", () => {
    const phase = readFile("engine/tick/phases/phase01_week_health.ts");
    expect(phase).toContain("recordGomenfuda");
    expect(phase).toMatch(/recordGomenfuda\s*\(/);
  });

  it("GomenfudaService is imported from the correct path", () => {
    const phase = readFile("engine/tick/phases/phase01_week_health.ts");
    expect(phase).toMatch(/from\s+["'].*GomenfudaService["']/);
  });
});

// ─── KachiNokoriService → CompetitionService.ts + phase05_monthly_boundary ───

describe("KachiNokoriService — CompetitionService wiring", () => {
  it("calculateKachiNokori is imported and called by CompetitionService", () => {
    const file = readFile("engine/lifecycle/CompetitionService.ts");
    expect(file).toContain("calculateKachiNokori");
    expect(file).toMatch(/calculateKachiNokori\s*\(/);
  });

  it("KachiNokoriService is imported from the correct path", () => {
    const file = readFile("engine/lifecycle/CompetitionService.ts");
    expect(file).toMatch(/from\s+["'].*KachiNokoriService["']/);
  });
});

describe("KachiNokoriService — monthly boundary wiring", () => {
  it("getKachiNokoriForRikishi is imported and called by phase05_monthly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    expect(phase).toContain("getKachiNokoriForRikishi");
    expect(phase).toMatch(/getKachiNokoriForRikishi\s*\(/);
  });

  it("KachiNokoriService is imported from the correct path", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    expect(phase).toMatch(/from\s+["'].*KachiNokoriService["']/);
  });
});

// ─── InjuredEncouragement → phase01_week_welfare.ts ──────────────────────────

describe("InjuredEncouragement — welfare phase wiring", () => {
  it("canEncourage is imported and called by phase01_week_welfare", () => {
    const phase = readFile("engine/tick/phases/phase01_week_welfare.ts");
    expect(phase).toContain("canEncourage");
    expect(phase).toMatch(/canEncourage\s*\(/);
  });

  it("provideEncouragement is imported and called by phase01_week_welfare", () => {
    const phase = readFile("engine/tick/phases/phase01_week_welfare.ts");
    expect(phase).toContain("provideEncouragement");
    expect(phase).toMatch(/provideEncouragement\s*\(/);
  });

  it("InjuredEncouragement is imported from the correct path", () => {
    const phase = readFile("engine/tick/phases/phase01_week_welfare.ts");
    expect(phase).toMatch(/from\s+["'].*InjuredEncouragement["']/);
  });
});

// ─── OyakataIntervention → phase01_basho_bouts.ts ────────────────────────────

describe("OyakataIntervention — basho bouts phase wiring", () => {
  it("applyOyakataIntervention is imported and called by phase01_basho_bouts", () => {
    const phase = readFile("engine/tick/phases/phase01_basho_bouts.ts");
    expect(phase).toContain("applyOyakataIntervention");
    expect(phase).toMatch(/applyOyakataIntervention\s*\(/);
  });

  it("OyakataIntervention is imported from the correct path", () => {
    const phase = readFile("engine/tick/phases/phase01_basho_bouts.ts");
    expect(phase).toMatch(/from\s+["'].*OyakataIntervention["']/);
  });
});
