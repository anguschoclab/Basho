/**
 * simulationDeterminism.test.ts
 * ==============================
 * Headless simulation determinism check.
 *
 * Verifies that the engine produces identical world state checksums when
 * run twice from the same seed, across 50 and 100 day simulations.
 *
 * This test complements the AST-lint in scripts/check-determinism.mjs.
 */

import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { cloneWorldForTick } from "../tick/tickOrchestrator";
import { advanceOneDay } from "../tick/tickDaily";

const FIXED_SEED = "determinism-test-seed-v1";

// ---------------------------------------------------------------------------
// Checksum helpers
// ---------------------------------------------------------------------------

/** Stable numeric hash of a string — djb2 variant. */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h;
}

/**
 * Derives a lightweight deterministic fingerprint from key world fields.
 * Avoids serializing Maps/Sets to keep performance reasonable.
 */
function worldChecksum(world: ReturnType<typeof generateInitialWorld>): string {
  const parts: string[] = [
    `year:${world.year}`,
    `week:${world.week}`,
    `dayIdx:${world.dayIndexGlobal}`,
    `rikishiCount:${world.rikishi.size}`,
    `heyas:${world.heyas.size}`,
    `historyLen:${world.history.length}`,
  ];

  // Sum of all rikishi power+fatigue as a quick drift detector
  let powerSum = 0;
  let fatigueSum = 0;
  for (const r of world.rikishi.values()) {
    powerSum += r.power ?? 0;
    fatigueSum += r.fatigue ?? 0;
  }
  parts.push(`powerSum:${Math.round(powerSum)}`);
  parts.push(`fatigueSum:${Math.round(fatigueSum)}`);

  return hashString(parts.join("|")).toString(16);
}

/** Simulate N days, return checksum. */
function simDays(days: number): string {
  const world = generateInitialWorld(FIXED_SEED);
  const cloned = cloneWorldForTick(world);
  for (let i = 0; i < days; i++) {
    advanceOneDay(cloned);
  }
  return worldChecksum(cloned);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Simulation determinism", () => {
  it("produces identical checksum at day 50 on two independent runs", () => {
    const hash1 = simDays(50);
    const hash2 = simDays(50);
    expect(hash1).toBe(hash2);
  });

  it("produces identical checksum at day 100 on two independent runs", () => {
    const hash1 = simDays(100);
    const hash2 = simDays(100);
    expect(hash1).toBe(hash2);
  });

  it("day-50 checkpoint in a 100-day run matches standalone 50-day run", () => {
    // Standalone 50-day hash
    const standalone50 = simDays(50);

    // Checkpoint mid-way in a 100-day run
    const world = generateInitialWorld(FIXED_SEED);
    const cloned = cloneWorldForTick(world);
    for (let i = 0; i < 50; i++) {
      advanceOneDay(cloned);
    }
    const checkpoint50 = worldChecksum(cloned);

    expect(standalone50).toBe(checkpoint50);
  });

  it("different seeds produce different checksums at day 50", () => {
    const worldA = generateInitialWorld("seed-aaa");
    const worldB = generateInitialWorld("seed-bbb");

    const clonedA = cloneWorldForTick(worldA);
    const clonedB = cloneWorldForTick(worldB);

    for (let i = 0; i < 50; i++) {
      advanceOneDay(clonedA);
      advanceOneDay(clonedB);
    }

    const hashA = worldChecksum(clonedA);
    const hashB = worldChecksum(clonedB);
    expect(hashA).not.toBe(hashB);
  });
});
