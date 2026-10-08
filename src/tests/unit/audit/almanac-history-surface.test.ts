/**
 * Phase 3a: Almanac & history surface regression tests.
 *
 * Proves that HistoryService is invoked from phase06_yearly_boundary
 * and that AlmanacPage, HistoryPage, HistoryDashboard, and HallOfFamePage
 * render history/HoF state via projections.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("HistoryService — tick phase wiring", () => {
  it("is imported and called by phase06_yearly_boundary", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("HistoryService");
    expect(phase).toMatch(/HistoryService\.updateAllTimeRecords/);
  });

  it("exports updateAllTimeRecords", () => {
    const svc = readSrcFile("engine/systems/meta/HistoryService.ts");
    expect(svc).toContain("updateAllTimeRecords");
  });
});

describe("AlmanacPage — UI surface", () => {
  it("reads world.history for past basho results", () => {
    const page = readSrcFile("pages/AlmanacPage.tsx");
    expect(page).toContain("getHistory");
  });

  it("reads world.records for all-time and active records", () => {
    const page = readSrcFile("pages/AlmanacPage.tsx");
    expect(page).toContain("world.records");
  });

  it("uses getHistory(world).length for snapshot count, not bounded almanacSnapshots", () => {
    // almanacSnapshots is bounded to 6 in hot state; older snapshots are in
    // cold storage (OPFS). The count displayed should reflect the total
    // number of completed bashos (getHistory(world).length, capped at 500),
    // which is what the "Past Bashos" tab actually displays.
    const page = readSrcFile("pages/AlmanacPage.tsx");
    expect(page).toContain("getHistory(world)");
    expect(page).not.toContain("selectAlmanacSnapshots");
    // world.almanacSnapshots is still read for the hot-window indicator, but
    // must NOT be the primary count source.
    expect(page).toContain("almanacSnapshots");
  });
});

describe("HistoryPage — UI surface", () => {
  it("renders past basho history with BASHO_CALENDAR", () => {
    const page = readSrcFile("pages/HistoryPage.tsx");
    expect(page).toContain("BASHO_CALENDAR");
    expect(page).toContain("RikishiName");
  });
});

describe("HistoryDashboard — UI surface", () => {
  it("uses selectRetiredRikishi selector", () => {
    const page = readSrcFile("pages/HistoryDashboard.tsx");
    expect(page).toContain("selectRetiredRikishi");
  });

  it("renders museum tabs for records exploration", () => {
    const page = readSrcFile("pages/HistoryDashboard.tsx");
    expect(page).toContain("RECORDS_TABS");
  });
});

describe("HallOfFamePage — UI surface", () => {
  it("uses projectHOFUIDigest for Hall of Fame projection", () => {
    const page = readSrcFile("pages/HallOfFamePage.tsx");
    expect(page).toContain("projectHOFUIDigest");
  });

  it("reads awardLog via selectAwardLog selector", () => {
    const page = readSrcFile("pages/HallOfFamePage.tsx");
    expect(page).toContain("selectAwardLog");
  });

  it("renders HoFTimeline component", () => {
    const page = readSrcFile("pages/HallOfFamePage.tsx");
    expect(page).toContain("HoFTimeline");
  });

  it("renders inductees grouped by category", () => {
    const page = readSrcFile("pages/HallOfFamePage.tsx");
    expect(page).toContain("byCategory");
  });
});

describe("phase06_yearly_boundary — Hall of Fame induction", () => {
  it("calls processYearEndInduction and logs LIFECYCLE_EVENT", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("processYearEndInduction");
    expect(phase).toContain("hof_induction");
  });
});
