import { describe, it, expect } from "vitest";
import {
  isEligibleForTsukebito,
  isEligibleTsukebito,
  setTsukebito,
  clearTsukebito,
  MAX_TSUKEBITO_PER_SENIOR,
} from "@/engine/systems/training/TsukebitoService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

function findSenior(world: WorldState): Rikishi {
  for (const r of world.rikishi.values()) {
    if ((r.rankNumber ?? 99) <= 3 && !r.isRetired) return r;
  }
  throw new Error("No senior rikishi found");
}

function findJunior(world: WorldState, senior: Rikishi): Rikishi {
  for (const r of world.rikishi.values()) {
    if ((r.rankNumber ?? 99) > 10 && !r.isRetired && r.heyaId === senior.heyaId) return r;
  }
  throw new Error("No junior rikishi found in same heya");
}

describe("Tsukebito player control — set/clear", () => {
  it("setTsukebito assigns a junior as tsukebito to a senior", () => {
    const world = generateInitialWorld("tsukebito-set-1");
    const senior = findSenior(world);
    const junior = findJunior(world, senior);

    const impact = setTsukebito(world, senior.id, junior.id);
    const updated = resolveImpacts(world, [impact]);

    const updatedSenior = updated.rikishi.get(senior.id)!;
    expect(updatedSenior.tsukebitoIds).toBeDefined();
    expect(updatedSenior.tsukebitoIds).toContain(junior.id);
  });

  it("setTsukebito refuses if senior is not eligible", () => {
    const world = generateInitialWorld("tsukebito-set-2");
    // Find a junior rikishi (rank > 10) to use as "senior"
    let fakeSenior: Rikishi | null = null;
    for (const r of world.rikishi.values()) {
      if ((r.rankNumber ?? 99) > 10 && !r.isRetired) {
        fakeSenior = r;
        break;
      }
    }
    if (!fakeSenior) throw new Error("No junior found");
    const junior = findJunior(world, fakeSenior);

    const impact = setTsukebito(world, fakeSenior.id, junior.id);
    // Should be a no-op (empty impact)
    expect((impact as any).rikishiUpdates ?? []).toHaveLength(0);
  });

  it("setTsukebito respects MAX_TSUKEBITO_PER_SENIOR limit", () => {
    const world = generateInitialWorld("tsukebito-set-3");
    const senior = findSenior(world);
    // Find all eligible juniors in same heya
    const juniors: Rikishi[] = [];
    for (const r of world.rikishi.values()) {
      if (isEligibleTsukebito(r, senior)) {
        juniors.push(r);
      }
    }
    if (juniors.length < MAX_TSUKEBITO_PER_SENIOR + 1) {
      // Skip if not enough juniors
      return;
    }

    let current = world;
    for (let i = 0; i < MAX_TSUKEBITO_PER_SENIOR + 1; i++) {
      const impact = setTsukebito(current, senior.id, juniors[i].id);
      current = resolveImpacts(current, [impact]);
    }

    const updatedSenior = current.rikishi.get(senior.id)!;
    expect(updatedSenior.tsukebitoIds?.length).toBeLessThanOrEqual(MAX_TSUKEBITO_PER_SENIOR);
  });

  it("clearTsukebito removes a tsukebito from a senior", () => {
    const world = generateInitialWorld("tsukebito-clear-1");
    const senior = findSenior(world);
    const junior = findJunior(world, senior);

    // First set
    const setImpact = setTsukebito(world, senior.id, junior.id);
    let current = resolveImpacts(world, [setImpact]);
    expect(current.rikishi.get(senior.id)!.tsukebitoIds).toContain(junior.id);

    // Then clear
    const clearImpact = clearTsukebito(current, senior.id, junior.id);
    current = resolveImpacts(current, [clearImpact]);

    const updatedSenior = current.rikishi.get(senior.id)!;
    expect(updatedSenior.tsukebitoIds ?? []).not.toContain(junior.id);
  });

  it("clearTsukebito is a no-op if junior was not assigned", () => {
    const world = generateInitialWorld("tsukebito-clear-2");
    const senior = findSenior(world);
    const junior = findJunior(world, senior);

    // Clear without setting first
    const impact = clearTsukebito(world, senior.id, junior.id);
    expect((impact as any).rikishiUpdates ?? []).toHaveLength(0);
  });

  it("setTsukebito refuses if junior is already assigned to another senior", () => {
    const world = generateInitialWorld("tsukebito-set-4");
    // Find two seniors in the same heya
    const seniors: Rikishi[] = [];
    for (const r of world.rikishi.values()) {
      if (isEligibleForTsukebito(r)) seniors.push(r);
    }
    if (seniors.length < 2) return;

    // Find a junior in the same heya as both seniors
    let junior: Rikishi | null = null;
    for (const r of world.rikishi.values()) {
      if (isEligibleTsukebito(r, seniors[0]) && isEligibleTsukebito(r, seniors[1])) {
        junior = r;
        break;
      }
    }
    if (!junior) return;

    // Assign to first senior
    let current = world;
    const setImpact1 = setTsukebito(current, seniors[0].id, junior.id);
    current = resolveImpacts(current, [setImpact1]);

    // Try to assign to second senior — should be refused
    const setImpact2 = setTsukebito(current, seniors[1].id, junior.id);
    const current2 = resolveImpacts(current, [setImpact2]);
    const secondSenior = current2.rikishi.get(seniors[1].id)!;
    expect(secondSenior.tsukebitoIds ?? []).not.toContain(junior.id);
  });
});
