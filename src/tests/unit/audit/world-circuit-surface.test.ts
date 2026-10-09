/**
 * Phase 3d: World circuit surface regression tests.
 *
 * Proves that /world-circuit and /global-cup routes are reachable from sidebar,
 * that WorldCircuitService is invoked from tick phases and NPC GlobalWorker,
 * and that GlobalCupPage and RegionalHubPage render world circuit state.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("WorldCircuitService — tick phase wiring", () => {
  it("applyStyleDrift is called by phase01_week_world_circuit", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_world_circuit.ts");
    expect(phase).toContain("WorldCircuitService");
    expect(phase).toMatch(/WorldCircuitService\.applyStyleDrift/);
  });

  it("generateYearlyInvitations is called by phase06_yearly_boundary", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("WorldCircuitService");
    expect(phase).toMatch(/WorldCircuitService\.generateYearlyInvitations/);
  });

  it("exports applyStyleDrift and generateYearlyInvitations", () => {
    const svc = readSrcFile("engine/systems/worldCircuit/WorldCircuitService.ts");
    expect(svc).toContain("applyStyleDrift");
    expect(svc).toContain("generateYearlyInvitations");
  });
});

describe("NPC GlobalWorker — weekly decision wiring", () => {
  it("spawnGlobalWorker is imported and called by weekly workers module", () => {
    const weekly = readSrcFile("engine/npcAI/weekly/workers.ts");
    expect(weekly).toContain("spawnGlobalWorker");
    expect(weekly).toMatch(/spawnGlobalWorker\s*\(/);
  });

  it("spawnGlobalWorker is exported from npcAIWorkers.ts", () => {
    const workers = readSrcFile("engine/npcAIWorkers.ts");
    expect(workers).toContain("export function spawnGlobalWorker");
  });
});

describe("GlobalCupService — tick phase wiring", () => {
  it("initializeTournament is called by phase06_yearly_boundary", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("GlobalCupService");
    expect(phase).toMatch(/GlobalCupService\.initializeTournament/);
  });
});

describe("Sidebar reachability — /global-cup and /world-circuit", () => {
  it("sidebarConfig includes /global-cup route", () => {
    const sidebar = readSrcFile("components/layout/sidebarConfig.ts");
    expect(sidebar).toContain("/global-cup");
  });

  it("sidebarConfig includes /world-circuit route", () => {
    const sidebar = readSrcFile("components/layout/sidebarConfig.ts");
    expect(sidebar).toContain("/world-circuit");
  });
});

describe("Route definitions — /global-cup and /world-circuit", () => {
  it("routes.tsx defines /global-cup route with GlobalCupPage", () => {
    const routes = readSrcFile("routes.tsx");
    expect(routes).toContain("/global-cup");
    expect(routes).toContain("GlobalCupPage");
  });

  it("routes.tsx defines /world-circuit route with RegionalHubPage", () => {
    const routes = readSrcFile("routes.tsx");
    expect(routes).toContain("/world-circuit");
    expect(routes).toContain("RegionalHubPage");
  });
});

describe("GlobalCupPage — UI surface", () => {
  it("uses projectGlobalCup for state projection", () => {
    const page = readSrcFile("pages/GlobalCupPage.tsx");
    expect(page).toContain("projectGlobalCup");
  });

  it("renders GlobalCupBracket for tournament bracket", () => {
    const sections = readSrcFile("components/game/GlobalCupSections.tsx");
    expect(sections).toContain("GlobalCupBracket");
  });

  it("renders EventFeed for event log continuity", () => {
    const page = readSrcFile("pages/GlobalCupPage.tsx");
    expect(page).toContain("EventFeed");
  });
});

describe("RegionalHubPage — UI surface", () => {
  it("renders world circuit regional presence and exhibitions", () => {
    const page = readSrcFile("pages/RegionalHubPage.tsx");
    expect(page).toContain("regionalPresence");
    expect(page).toContain("pendingExhibitions");
  });

  it("uses TOURNAMENT_TABS for sub-navigation", () => {
    const page = readSrcFile("pages/RegionalHubPage.tsx");
    expect(page).toContain("TOURNAMENT_TABS");
  });
});
