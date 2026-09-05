/**
 * TsukebitoService.setTsukebito.test.ts — tests setTsukebito validates and sets tsukebito.
 * Plan Feature 10 Test-First Protocol item 1.
 */
import { describe, it, expect } from "vitest";
import { setTsukebito, isEligibleForTsukebito, isEligibleTsukebito } from "@/engine/systems/training/TsukebitoService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

function getSekitori(world: any) {
  for (const id of world.activeRikishiIds ?? []) {
    const r = world.rikishi.get(id);
    if (r && isEligibleForTsukebito(r)) return r;
  }
  throw new Error("No eligible senior found");
}

function getJunior(world: any, senior: any) {
  for (const id of world.activeRikishiIds ?? []) {
    const r = world.rikishi.get(id);
    if (r && r.id !== senior.id && isEligibleTsukebito(r, senior)) return r;
  }
  throw new Error("No eligible junior found");
}

describe("setTsukebito", () => {
  it("sets tsukebitoIds on the senior rikishi", () => {
    const world = generateInitialWorld("set-tsukebito-test");
    const senior = getSekitori(world);
    const junior = getJunior(world, senior);

    const impact = setTsukebito(world, senior.id, junior.id);
    const updated = resolveImpacts(world, [impact]);

    const updatedSenior = updated.rikishi.get(senior.id);
    expect(updatedSenior?.tsukebitoIds).toContain(junior.id);
  });

  it("marks tsukebitoPlayerSet flag as true", () => {
    const world = generateInitialWorld("set-tsukebito-flag-test");
    const senior = getSekitori(world);
    const junior = getJunior(world, senior);

    const impact = setTsukebito(world, senior.id, junior.id);
    const updated = resolveImpacts(world, [impact]);

    const updatedSenior = updated.rikishi.get(senior.id);
    expect(updatedSenior?.tsukebitoPlayerSet).toBe(true);
  });
});
