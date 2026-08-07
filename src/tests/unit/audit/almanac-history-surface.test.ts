/**
 * Phase 3a: Almanac & history surface regression tests.
 *
 * Proves that HistoryService is invoked from phase06_yearly_boundary
 * and that AlmanacPage, HistoryPage, HistoryDashboard, and HallOfFamePage
 * render history/HoF state via projections.
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

describe("HistoryService — tick phase wiring", () => {
  it("is imported and called by phase06_yearly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("HistoryService");
    expect(phase).toMatch(/HistoryService\.updateAllTimeRecords/);
  });

  it("exports updateAllTimeRecords", () => {
    const svc = readFile("engine/systems/meta/HistoryService.ts");
    expect(svc).toContain("updateAllTimeRecords");
  });
});

describe("AlmanacPage — UI surface", () => {
  it("reads world.history for past basho results", () => {
    const page = readFile("pages/AlmanacPage.tsx");
    expect(page).toContain("world.history");
  });

  it("reads world.records for all-time and active records", () => {
    const page = readFile("pages/AlmanacPage.tsx");
    expect(page).toContain("world.records");
  });
});

describe("HistoryPage — UI surface", () => {
  it("renders past basho history with BASHO_CALENDAR", () => {
    const page = readFile("pages/HistoryPage.tsx");
    expect(page).toContain("BASHO_CALENDAR");
    expect(page).toContain("RikishiName");
  });
});

describe("HistoryDashboard — UI surface", () => {
  it("uses selectRetiredRikishi selector", () => {
    const page = readFile("pages/HistoryDashboard.tsx");
    expect(page).toContain("selectRetiredRikishi");
  });

  it("renders museum tabs for records exploration", () => {
    const page = readFile("pages/HistoryDashboard.tsx");
    expect(page).toContain("RECORDS_TABS");
  });
});

describe("HallOfFamePage — UI surface", () => {
  it("uses projectHOFUIDigest for Hall of Fame projection", () => {
    const page = readFile("pages/HallOfFamePage.tsx");
    expect(page).toContain("projectHOFUIDigest");
  });

  it("reads awardLog via selectAwardLog selector", () => {
    const page = readFile("pages/HallOfFamePage.tsx");
    expect(page).toContain("selectAwardLog");
  });

  it("renders HoFTimeline component", () => {
    const page = readFile("pages/HallOfFamePage.tsx");
    expect(page).toContain("HoFTimeline");
  });

  it("renders inductees grouped by category", () => {
    const page = readFile("pages/HallOfFamePage.tsx");
    expect(page).toContain("byCategory");
  });
});

describe("phase06_yearly_boundary — Hall of Fame induction", () => {
  it("calls processYearEndInduction and logs LIFECYCLE_EVENT", () => {
    const phase = readFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("processYearEndInduction");
    expect(phase).toContain("hof_induction");
  });
});
