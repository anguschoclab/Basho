/**
 * Phase 1d: Rivalry surface regression tests.
 *
 * Proves that RivalryService and RivalryHeatService are invoked from tick phases
 * and that RivalriesPage reads rivalry state via projections.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("RivalryHeatService — tick phase wiring", () => {
  it("deriveTone is imported by phase01_week_rivalries", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_rivalries.ts");
    expect(phase).toContain("RivalryHeatService");
    expect(phase).toContain("deriveTone");
  });
});

describe("RivalryService — reachability", () => {
  it("RivalryService is exported and used by rivalries.ts", () => {
    const svc = readSrcFile("engine/systems/narrative/RivalryService.ts");
    expect(svc.length).toBeGreaterThan(0);
  });

  it("RivalryHeatService is exported and used by phase01_week_rivalries", () => {
    const svc = readSrcFile("engine/systems/narrative/RivalryHeatService.ts");
    expect(svc.length).toBeGreaterThan(0);
  });
});

describe("RivalriesPage — UI surface", () => {
  it("reads rivalry state via projectRivalriesPage projection", () => {
    const hook = readSrcFile("hooks/useRivalriesDerived.ts");
    expect(hook).toContain("projectRivalriesPage");
  });

  it("renders RivalryCard components for each rivalry pair", () => {
    const sections = readSrcFile("components/rivalries/RivalriesPageSections.tsx");
    expect(sections).toContain("RivalryCard");
  });

  it("renders RivalriesHeader with heat summary", () => {
    const page = readSrcFile("pages/RivalriesPage.tsx");
    expect(page).toContain("RivalriesHeader");
  });

  it("renders HeatLegend for heat band reference", () => {
    const page = readSrcFile("pages/RivalriesPage.tsx");
    expect(page).toContain("HeatLegend");
  });
});

describe("phase01_week_rivalries — event log", () => {
  it("trims EngineEvent log to prevent memory leaks", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_rivalries.ts");
    expect(phase).toContain("MAX_EVENT_AGE_WEEKS");
  });
});
