import { describe, it, expect } from "vitest";
import { runElections } from "@/engine/governance/services/ScandalService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { ELECTION_INCUMBENCY_BONUS } from "@/constants/engine/succession";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";

function worldWithHeyas(): { world: WorldState; playerOya: Oyakata } {
  const world = makeMockWorld({ year: 2030 });
  const playerHeya = makeMockHeya("h-player", { politicalCapital: 95, reputation: 90, oyakataId: "oya-p" });
  const npcHeya = makeMockHeya("h-npc", { politicalCapital: 10, reputation: 10, oyakataId: "oya-n" });
  world.heyas.set(playerHeya.id, playerHeya);
  world.heyas.set(npcHeya.id, npcHeya);
  for (const id of ["n1", "n2", "n3", "n4", "n5"]) {
    world.heyas.set(id as never, makeMockHeya(id, { politicalCapital: 80, reputation: 80 }));
  }
  const playerOya = { id: "oya-p", name: "P", heyaId: "h-player", tenure: { startedYear: 2029, bashoServed: 1, championships: 0, sekitoriProduced: 0, insolvencyEvents: 0, majorScandals: 0, forcedMergers: 0, boardSeatsWon: 0 } } as unknown as Oyakata;
  const npcOya = { id: "oya-n", name: "N", heyaId: "h-npc" } as unknown as Oyakata;
  world.oyakata.set(playerOya.id, playerOya);
  world.oyakata.set(npcOya.id, npcOya);
  return { world, playerOya };
}

describe("runElections — tenure + incumbency", () => {
  it("bumps tenure.boardSeatsWon exactly once per elected heya", () => {
    const { world } = worldWithHeyas();
    const next = resolveImpacts(world, [runElections(world)]);
    expect(next.oyakata.get("oya-p")?.tenure?.boardSeatsWon).toBe(1);
    // Non-elected heyas' tenure untouched
    expect(next.oyakata.get("oya-n")?.tenure?.boardSeatsWon ?? 0).toBe(0);
  });

  it("applies the configured incumbency bonus, not a hardcoded bump", () => {
    const { world } = worldWithHeyas();
    const before = world.heyas.get("h-player")!.politicalCapital!;
    const next = resolveImpacts(world, [runElections(world)]);
    const after = next.heyas.get("h-player")!.politicalCapital!;
    expect(after).toBe(Math.min(100, before + ELECTION_INCUMBENCY_BONUS));
  });
});
