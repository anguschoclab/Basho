import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { setTsukebito, clearTsukebito } from "@/engine/systems/training/TsukebitoService";
import { getRikishi } from "@/engine/queries";
import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";

function findSeniorAndJunior(world: WorldState) {
  const rikishi = Array.from(world.rikishi.values()).filter((r) => !r.isRetired);
  // Find a senior (sekitori) and a junior (lower rank)
  const seniors = rikishi.filter((r) => {
    const rank = r.rank ?? "";
    return ["Yokozuna", "Ozeki", "Sekiwake", "Komusubi", "Maegashira-1", "Maegashira-2"].some(
      (s) => rank.startsWith(s)
    );
  });
  const juniors = rikishi.filter((r) => {
    const rank = r.rank ?? "";
    return ["Jonokuchi", "Jonidan", "Sandanme", "Makushita"].some((s) => rank.startsWith(s));
  });
  return {
    senior: seniors[0] ?? rikishi[0],
    junior: juniors[0] ?? rikishi[1],
  };
}

describe("Phase 01 — Tsukebito player-set skip", () => {
  it("setTsukebito marks the senior with tsukebitoPlayerSet=true", () => {
    const world = generateInitialWorld("tsukebito-playerset-1");
    const { senior, junior } = findSeniorAndJunior(world);
    if (!senior || !junior) return;

    const impact = setTsukebito(world, senior.id, junior.id);
    const updated = resolveImpacts(world, [impact]);
    const s = updated.rikishi.get(senior.id);
    expect(s?.tsukebitoPlayerSet).toBe(true);
    expect(s?.tsukebitoIds).toContain(junior.id);
  });

  it("clearTsukebito keeps tsukebitoPlayerSet=true (player explicitly chose)", () => {
    const world = generateInitialWorld("tsukebito-playerset-2");
    const { senior, junior } = findSeniorAndJunior(world);
    if (!senior || !junior) return;

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
    const { senior } = findSeniorAndJunior(world);
    if (!senior) return;
    expect(senior.tsukebitoPlayerSet).toBeUndefined();
  });
});
