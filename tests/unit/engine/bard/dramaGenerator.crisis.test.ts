import { describe, it, expect } from "vitest";
import { checkTriggeredDrama } from "@/engine/bard/dramaGenerator";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { StateImpact } from "@/engine/core/StateImpact";

function crisisSetOn(impact: StateImpact, heyaId: string): boolean {
  const update = impact.entities?.heyaUpdates?.get(heyaId);
  return update?.activeCrisis !== undefined;
}

describe("checkTriggeredDrama — player vs NPC crisis routing", () => {
  it("triggers a crisis for the player heya identified by world.playerHeyaId", () => {
    const playerHeya = makeMockHeya("player_heya", { funds: -1_000_000 });
    const world = makeMockWorld({
      playerHeyaId: "player_heya",
      heyas: new Map([["player_heya", playerHeya]]),
    });
    const impact = checkTriggeredDrama(world);
    expect(crisisSetOn(impact, "player_heya")).toBe(true);
  });

  it("player crisis is not starved by an insolvent NPC sorting earlier", () => {
    // "aaa_npc" sorts before "zzz_player" — the NPC consumes the single
    // per-tick NPC slot, but the player must still get their own crisis.
    const npc = makeMockHeya("aaa_npc", { funds: -1_000_000 });
    const playerHeya = makeMockHeya("zzz_player", { funds: -2_000_000 });
    const world = makeMockWorld({
      playerHeyaId: "zzz_player",
      heyas: new Map([
        ["aaa_npc", npc],
        ["zzz_player", playerHeya],
      ]),
    });
    const impact = checkTriggeredDrama(world);
    expect(crisisSetOn(impact, "zzz_player")).toBe(true);
    expect(crisisSetOn(impact, "aaa_npc")).toBe(true);
  });

  it("player heya does not consume the bounded NPC crisis slot", () => {
    // Player sorts first — with correct routing the NPC after it should
    // still receive the single NPC crisis for the tick.
    const playerHeya = makeMockHeya("aaa_player", { funds: -1_000_000 });
    const npc = makeMockHeya("zzz_npc", { funds: -2_000_000 });
    const world = makeMockWorld({
      playerHeyaId: "aaa_player",
      heyas: new Map([
        ["aaa_player", playerHeya],
        ["zzz_npc", npc],
      ]),
    });
    const impact = checkTriggeredDrama(world);
    expect(crisisSetOn(impact, "aaa_player")).toBe(true);
    expect(crisisSetOn(impact, "zzz_npc")).toBe(true);
  });

  it("does not re-trigger while the player already has an open crisis", () => {
    const existing = {
      id: "CRISIS-existing",
      type: "financial_insolvency",
      title: "Open",
      description: "Already open",
      options: [],
    };
    const playerHeya = makeMockHeya("player_heya", {
      funds: -1_000_000,
      activeCrisis: existing,
    });
    const world = makeMockWorld({
      playerHeyaId: "player_heya",
      heyas: new Map([["player_heya", playerHeya]]),
    });
    const impact = checkTriggeredDrama(world);
    expect(impact.entities?.heyaUpdates?.has("player_heya") ?? false).toBe(false);
  });
});
