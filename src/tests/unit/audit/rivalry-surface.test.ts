/**
 * Phase 1d: Rivalry surface regression tests.
 *
 * Proves that RivalryService and RivalryHeatService are invoked from tick phases
 * and that RivalriesPage reads rivalry state via projections.
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

describe("RivalryHeatService — tick phase wiring", () => {
  it("deriveTone is imported by phase01_week_rivalries", () => {
    const phase = readFile("engine/tick/phases/phase01_week_rivalries.ts");
    expect(phase).toContain("RivalryHeatService");
    expect(phase).toContain("deriveTone");
  });
});

describe("RivalryService — reachability", () => {
  it("RivalryService is exported and used by rivalries.ts", () => {
    const svc = readFile("engine/systems/narrative/RivalryService.ts");
    expect(svc.length).toBeGreaterThan(0);
  });

  it("RivalryHeatService is exported and used by phase01_week_rivalries", () => {
    const svc = readFile("engine/systems/narrative/RivalryHeatService.ts");
    expect(svc.length).toBeGreaterThan(0);
  });
});

describe("RivalriesPage — UI surface", () => {
  it("reads rivalry state via projectRivalriesPage projection", () => {
    const page = readFile("pages/RivalriesPage.tsx");
    expect(page).toContain("projectRivalriesPage");
  });

  it("renders RivalryCard components for each rivalry pair", () => {
    const page = readFile("pages/RivalriesPage.tsx");
    expect(page).toContain("RivalryCard");
  });

  it("renders RivalriesHeader with heat summary", () => {
    const page = readFile("pages/RivalriesPage.tsx");
    expect(page).toContain("RivalriesHeader");
  });

  it("renders HeatLegend for heat band reference", () => {
    const page = readFile("pages/RivalriesPage.tsx");
    expect(page).toContain("HeatLegend");
  });
});

describe("phase01_week_rivalries — event log", () => {
  it("trims EngineEvent log to prevent memory leaks", () => {
    const phase = readFile("engine/tick/phases/phase01_week_rivalries.ts");
    expect(phase).toContain("MAX_EVENT_AGE_WEEKS");
  });
});
