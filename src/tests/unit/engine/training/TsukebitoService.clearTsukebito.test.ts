/**
 * TsukebitoService.clearTsukebito.test.ts — tests clearTsukebito removes tsukebito and clears flag.
 * Plan Feature 10 Test-First Protocol item 2.
 */
import { describe, it, expect } from "vitest";
import { setTsukebito, clearTsukebito, isEligibleForTsukebito, isEligibleTsukebito } from "@/engine/systems/training/TsukebitoService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

function getSekitori(world: any) {
  for (const id of world.activeRikishiIds ?? []) {
    const r = world.rikishi.get(id);
    if (r && isEligibleForTsukebito(r)) return r;
  }
  throw new Error("No eligible senior");
}

function getJunior(world: any, senior: any) {
  for (const id of world.activeRikishiIds ?? []) {
    const r = world.rikishi.get(id);
    if (r && r.id !== senior.id && isEligibleTsukebito(r, senior)) return r;
  }
  throw new Error("No eligible junior");
}

describe("clearTsukebito", () => {
  it("removes a tsukebito from a senior", () => {
    const world = generateInitialWorld("clear-tsukebito-test");
    const senior = getSekitori(world);
    const junior = getJunior(world, senior);

    // First set
    const setImpact = setTsukebito(world, senior.id, junior.id);
    const w1 = resolveImpacts(world, [setImpact]);
    expect(w1.rikishi.get(senior.id)?.tsukebitoIds).toContain(junior.id);

    // Then clear
    const clearImpact = clearTsukebito(w1, senior.id, junior.id);
    const w2 = resolveImpacts(w1, [clearImpact]);

    const cleared = w2.rikishi.get(senior.id);
    expect(cleared?.tsukebitoIds ?? []).not.toContain(junior.id);
  });

  it("keeps tsukebitoPlayerSet flag true after clearing (player retains control)", () => {
    const world = generateInitialWorld("clear-tsukebito-flag-test");
    const senior = getSekitori(world);
    const junior = getJunior(world, senior);

    const setImpact = setTsukebito(world, senior.id, junior.id);
    const w1 = resolveImpacts(world, [setImpact]);
    expect(w1.rikishi.get(senior.id)?.tsukebitoPlayerSet).toBe(true);

    const clearImpact = clearTsukebito(w1, senior.id, junior.id);
    const w2 = resolveImpacts(w1, [clearImpact]);
    // Flag stays true — player has taken control of tsukebito assignment
    expect(w2.rikishi.get(senior.id)?.tsukebitoPlayerSet).toBe(true);
    // But tsukebitoIds should be empty
    expect(w2.rikishi.get(senior.id)?.tsukebitoIds ?? []).not.toContain(junior.id);
  });
});
