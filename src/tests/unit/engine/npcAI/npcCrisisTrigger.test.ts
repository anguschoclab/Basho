import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { checkTriggeredDrama } from "@/engine/bard/dramaGenerator";
import { applyImpact } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

/**
 * WS3 contract tests — NPC crisis triggering.
 *
 * Insolvency (funds < 0) must set `heya.activeCrisis` on NPC heyas too —
 * bounded to at most one NPC crisis per tick, deterministic by seed —
 * while the player path is preserved untouched.
 */

function worldWithInsolventHeyas(npcIds: string[], playerInsolvent = false): WorldState {
  const heyas = new Map();
  for (const id of npcIds) {
    heyas.set(
      id,
      MockFactory.createHeya(id, {
        funds: -1000,
        riskIndicators: { financial: false, governance: false, rivalry: false },
      })
    );
  }
  heyas.set(
    "player-heya",
    MockFactory.createHeya("player-heya", {
      isPlayerOwned: true,
      funds: playerInsolvent ? -500 : 1_000_000,
      riskIndicators: { financial: false, governance: false, rivalry: false },
    })
  );
  return MockFactory.createWorld({ heyas, playerHeyaId: "player-heya" });
}

function npcCrisesSet(impact: ReturnType<typeof checkTriggeredDrama>): string[] {
  const out: string[] = [];
  for (const [id, update] of impact.entities?.heyaUpdates ?? []) {
    if (update.activeCrisis) out.push(id);
  }
  return out;
}

describe("checkTriggeredDrama — NPC crisis eligibility", () => {
  it("sets activeCrisis on an insolvent NPC heya", () => {
    const world = worldWithInsolventHeyas(["heya-a"]);
    const impact = checkTriggeredDrama(world);
    expect(npcCrisesSet(impact)).toContain("heya-a");
  });

  it("bounds NPC crises to at most one per tick", () => {
    const world = worldWithInsolventHeyas(["heya-a", "heya-b", "heya-c"]);
    const impact = checkTriggeredDrama(world);
    const npcCrises = npcCrisesSet(impact).filter((id) => id !== "player-heya");
    expect(npcCrises.length).toBeLessThanOrEqual(1);
  });

  it("preserves the player path: an insolvent player heya still gets its crisis", () => {
    const world = worldWithInsolventHeyas(["heya-a"], true);
    const impact = checkTriggeredDrama(world);
    expect(npcCrisesSet(impact)).toContain("player-heya");
  });

  it("does not retrigger while a heya already has an active crisis", () => {
    const world = worldWithInsolventHeyas(["heya-a"]);
    const first = checkTriggeredDrama(world);
    const afterFirst = applyImpact(world, first);
    expect(afterFirst.heyas.get("heya-a")?.activeCrisis).toBeDefined();
    const second = checkTriggeredDrama(afterFirst);
    expect(npcCrisesSet(second)).not.toContain("heya-a");
  });

  it("is deterministic: same world produces the same NPC crisis", () => {
    const w1 = worldWithInsolventHeyas(["heya-a", "heya-b"]);
    const w2 = worldWithInsolventHeyas(["heya-a", "heya-b"]);
    const i1 = checkTriggeredDrama(w1);
    const i2 = checkTriggeredDrama(w2);
    expect(npcCrisesSet(i1)).toEqual(npcCrisesSet(i2));
    const c1 = i1.entities?.heyaUpdates?.get("heya-a")?.activeCrisis;
    const c2 = i2.entities?.heyaUpdates?.get("heya-a")?.activeCrisis;
    // impactGenerator closures can't deep-equal; compare the data payload.
    expect({
      id: c1?.id,
      type: c1?.type,
      title: c1?.title,
      options: c1?.options.map((o) => o.id),
    }).toEqual({
      id: c2?.id,
      type: c2?.type,
      title: c2?.title,
      options: c2?.options.map((o) => o.id),
    });
  });
});
