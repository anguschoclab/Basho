import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { setTsukebito, clearTsukebito } from "@/engine/systems/training/TsukebitoService";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

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

describe("Phase 01 — Tsukebito player-set skip", () => {
  it("setTsukebito marks the senior with tsukebitoPlayerSet=true", () => {
    const world = generateInitialWorld("tsukebito-playerset-1");
    const senior = findSenior(world);
    const junior = findJunior(world, senior);

    const impact = setTsukebito(world, senior.id, junior.id);
    const updated = resolveImpacts(world, [impact]);
    const s = updated.rikishi.get(senior.id);
    expect(s?.tsukebitoPlayerSet).toBe(true);
    expect(s?.tsukebitoIds).toContain(junior.id);
  });

  it("clearTsukebito keeps tsukebitoPlayerSet=true (player explicitly chose)", () => {
    const world = generateInitialWorld("tsukebito-playerset-2");
    const senior = findSenior(world);
    const junior = findJunior(world, senior);

    let current = resolveImpacts(world, [setTsukebito(world, senior.id, junior.id)]);
    const s1 = current.rikishi.get(senior.id);
    expect(s1?.tsukebitoPlayerSet).toBe(true);

    current = resolveImpacts(current, [clearTsukebito(current, senior.id, junior.id)]);
    const s2 = current.rikishi.get(senior.id);
    expect(s2?.tsukebitoPlayerSet).toBe(true);
    expect(s2?.tsukebitoIds).not.toContain(junior.id);
  });

  it("tsukebitoPlayerSet defaults to undefined on new rikishi", () => {
    const world = generateInitialWorld("tsukebito-playerset-3");
    const senior = findSenior(world);
    expect(senior.tsukebitoPlayerSet).toBeUndefined();
  });
});
