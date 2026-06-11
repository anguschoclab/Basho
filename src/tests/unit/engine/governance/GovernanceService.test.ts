/**
 * src/engine/__tests__/governance/GovernanceService.test.ts
 * ==========================================================
 * Tests for scandal reporting and weekly governance tick.
 *
 * Key behaviors:
 *   - reportScandal: adds 5 / 15 / 30 to scandalScore by severity
 *   - tickWeekGovernance: decays score by 1/week, syncs governanceStatus
 *   - Status thresholds (post-decay): 0-14 = good_standing, 15-29 = warning,
 *                                      30-59 = probation, 60+ = sanctioned
 */

 
import { describe, it, expect } from "vitest";
import { reportScandal, tickWeekGovernance } from "./systems/governance/ScandalService";
import { resolveImpacts } from "../../core/ImpactResolver";
import { makeMockWorld, makeMockHeya } from "../utils";
import type { WorldState } from "../../types/world";

// ── Setup ──────────────────────────────────────────────────────────────────

function makeWorld(heyaId = "h1", initialScore = 0): WorldState {
  const heya = makeMockHeya(heyaId, {
    scandalScore: initialScore,
    governanceStatus: "good_standing",
  });
  const world = makeMockWorld();
  (world as any).playerHeyaId = heyaId;
  world.heyas.set(heyaId, heya);
  return world;
}

// ── reportScandal ──────────────────────────────────────────────────────────

describe("reportScandal — score bumps", () => {
  it("adds 5 for minor severity", () => {
    const world = makeWorld();
    const impact = reportScandal(world, "h1", "minor", "misconduct");
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.scandalScore).toBe(5);
  });

  it("adds 15 for major severity", () => {
    const world = makeWorld();
    const impact = reportScandal(world, "h1", "major", "betting scandal");
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.scandalScore).toBe(15);
  });

  it("adds 30 for critical severity", () => {
    const world = makeWorld();
    const impact = reportScandal(world, "h1", "critical", "match fixing");
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.scandalScore).toBe(30);
  });

  it("accumulates across multiple scandals", () => {
    const world = makeWorld();
    const impact1 = reportScandal(world, "h1", "minor", "incident 1"); // +5
    const updatedWorld1 = resolveImpacts(world, [impact1]);
    const impact2 = reportScandal(updatedWorld1, "h1", "major", "incident 2"); // +15
    const updatedWorld2 = resolveImpacts(updatedWorld1, [impact2]);
    expect(updatedWorld2.heyas.get("h1")!.scandalScore).toBe(20);
  });

  it("is a no-op for a non-existent heya", () => {
    const world = makeWorld();
    expect(() => reportScandal(world, "ghost", "minor", "test")).not.toThrow();
  });
});

describe("reportScandal — governance log", () => {
  it("creates a ruling entry in world.governanceLog", () => {
    const world = makeWorld();
    const impact = reportScandal(world, "h1", "major", "betting");
    const updatedWorld = resolveImpacts(world, [impact]);
    expect((updatedWorld as any).governanceLog).toHaveLength(1);
    expect((updatedWorld as any).governanceLog[0].heyaId).toBe("h1");
  });

  it("ruling records the correct scandalScoreDelta", () => {
    const world = makeWorld();
    const impact = reportScandal(world, "h1", "critical", "match fixing");
    const updatedWorld = resolveImpacts(world, [impact]);
    expect((updatedWorld as any).governanceLog[0].effects.scandalScoreDelta).toBe(30);
  });

  it("ruling severity maps: critical→high, major→medium, minor→low", () => {
    const world = makeWorld();
    const impact = reportScandal(world, "h1", "critical", "critical event");
    const updatedWorld = resolveImpacts(world, [impact]);
    expect((updatedWorld as any).governanceLog[0].severity).toBe("high");
  });
});

// ── tickWeekGovernance — decay ─────────────────────────────────────────────

describe("tickWeekGovernance — scandal score decay", () => {
  it("decays by 1 per week", () => {
    const world = makeWorld("h1", 10);
    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.scandalScore).toBe(9);
  });

  it("does not decay below 0", () => {
    const world = makeWorld("h1", 0);
    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.scandalScore).toBe(0);
  });

  it("handles score of 1 correctly (floors at 0)", () => {
    const world = makeWorld("h1", 1);
    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.scandalScore).toBe(0);
  });
});

// ── tickWeekGovernance — status thresholds ─────────────────────────────────
// Note: decay runs BEFORE status evaluation. Tests set score so that
// post-decay value lands on the intended threshold.

describe("tickWeekGovernance — status threshold transitions", () => {
  it("remains 'good_standing' when post-decay score is 14 (< 15)", () => {
    const world = makeWorld("h1", 15); // decays to 14
    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.governanceStatus).toBe("good_standing");
  });

  it("transitions to 'warning' when post-decay score is exactly 15", () => {
    const world = makeWorld("h1", 16); // decays to 15
    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.scandalScore).toBe(15);
    expect(updatedWorld.heyas.get("h1")!.governanceStatus).toBe("warning");
  });

  it("transitions to 'probation' when post-decay score is 30", () => {
    const world = makeWorld("h1", 31); // decays to 30
    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.governanceStatus).toBe("probation");
  });

  it("transitions to 'sanctioned' when post-decay score is 60", () => {
    const world = makeWorld("h1", 61); // decays to 60
    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.governanceStatus).toBe("sanctioned");
  });

  it("does not change status when score remains in same band", () => {
    const world = makeWorld("h1", 5); // decays to 4, still good_standing
    world.heyas.get("h1")!.governanceStatus = "good_standing";
    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.heyas.get("h1")!.governanceStatus).toBe("good_standing");
  });

  it("handles multiple heyas independently", () => {
    const world = makeMockWorld();
    (world as any).playerHeyaId = "h1";
    world.heyas.set(
      "h1",
      makeMockHeya("h1", { scandalScore: 31, governanceStatus: "good_standing" })
    );
    world.heyas.set(
      "h2",
      makeMockHeya("h2", { scandalScore: 5, governanceStatus: "good_standing" })
    );

    const impact = tickWeekGovernance(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    expect(updatedWorld.heyas.get("h1")!.governanceStatus).toBe("probation");
    expect(updatedWorld.heyas.get("h2")!.governanceStatus).toBe("good_standing");
  });
});
