import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { checkTriggeredDrama } from "@/engine/bard/dramaGenerator";
import { resolveNPCCrisis } from "@/engine/npcAI/handlers";
import { applyImpact } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

/**
 * WS3 contract tests — NPC crisis resolution.
 *
 * An NPC heya carrying `activeCrisis` must have it resolved by the
 * CrisisAgent: a deterministic choice, the chosen option's real impact,
 * and the field cleared. `world.pendingCrisis` is never touched — the
 * player-blocking modal path is player-only.
 */

function worldWithCrisisHeya(traits?: {
  risk?: number;
  tradition?: number;
  ambition?: number;
}): { world: WorldState; heya: Heya } {
  const oyakata = MockFactory.createOyakata("oya-a", {
    heyaId: "heya-a",
    traits: {
      ambition: traits?.ambition ?? 50,
      risk: traits?.risk ?? 50,
      tradition: traits?.tradition ?? 50,
      patience: 50,
      compassion: traits && "compassion" in traits ? 80 : 50,
    },
  });
  const heya = MockFactory.createHeya("heya-a", {
    oyakataId: "oya-a",
    funds: -1000,
    reputation: 60,
    politicalCapital: 40,
    scandalScore: 0,
    riskIndicators: { financial: false, governance: false, rivalry: false },
  });
  const world = MockFactory.createWorld({
    heyas: new Map([
      ["heya-a", heya],
      ["player-heya", MockFactory.createHeya("player-heya", { isPlayerOwned: true })],
    ]),
    oyakata: new Map([["oya-a", oyakata]]),
    playerHeyaId: "player-heya",
    week: 7,
  });
  return { world, heya };
}

function triggerAndApply(world: WorldState): WorldState {
  return applyImpact(world, checkTriggeredDrama(world));
}

describe("resolveNPCCrisis", () => {
  it("resolves an NPC activeCrisis: choice made, impact applied, field cleared", () => {
    const { world } = worldWithCrisisHeya({ risk: 80 });
    const triggered = triggerAndApply(world);
    const crisis = triggered.heyas.get("heya-a")?.activeCrisis;
    expect(crisis, "insolvency must set activeCrisis on the NPC heya").toBeDefined();

    const impact = resolveNPCCrisis(triggered, "heya-a", crisis!);
    const resolved = applyImpact(triggered, impact);
    expect(resolved.heyas.get("heya-a")?.activeCrisis).toBeUndefined();
  });

  it("a risk-taking oyakata takes the emergency loan and the funds actually land", () => {
    const { world } = worldWithCrisisHeya({ risk: 80 });
    const triggered = triggerAndApply(world);
    const crisis = triggered.heyas.get("heya-a")!.activeCrisis!;
    const resolved = applyImpact(triggered, resolveNPCCrisis(triggered, "heya-a", crisis));
    expect(
      resolved.heyas.get("heya-a")!.funds,
      "emergency_loan must add real funds, not just log"
    ).toBeGreaterThan(-1000);
  });

  it("a conservative oyakata pleads with the JSA and loses real reputation", () => {
    const { world } = worldWithCrisisHeya({ tradition: 80 });
    const triggered = triggerAndApply(world);
    const crisis = triggered.heyas.get("heya-a")!.activeCrisis!;
    const resolved = applyImpact(triggered, resolveNPCCrisis(triggered, "heya-a", crisis));
    const heya = resolved.heyas.get("heya-a")!;
    expect(heya.reputation, "seek_pardon must cost reputation").toBeLessThan(60);
    expect(heya.funds, "seek_pardon must not inject funds").toBe(-1000);
  });

  it("never sets world.pendingCrisis (the player modal path stays player-only)", () => {
    const { world } = worldWithCrisisHeya({ risk: 80 });
    const triggered = triggerAndApply(world);
    const crisis = triggered.heyas.get("heya-a")!.activeCrisis!;
    const impact = resolveNPCCrisis(triggered, "heya-a", crisis);
    expect(impact.worldFields?.pendingCrisis).toBeUndefined();
    const resolved = applyImpact(triggered, impact);
    expect(resolved.pendingCrisis).toBeUndefined();
  });

  it("is deterministic: identical worlds produce identical choices", () => {
    const a = worldWithCrisisHeya({ risk: 80 });
    const b = worldWithCrisisHeya({ risk: 80 });
    const t1 = triggerAndApply(a.world);
    const t2 = triggerAndApply(b.world);
    const c1 = t1.heyas.get("heya-a")!.activeCrisis!;
    const c2 = t2.heyas.get("heya-a")!.activeCrisis!;
    const i1 = resolveNPCCrisis(t1, "heya-a", c1);
    const i2 = resolveNPCCrisis(t2, "heya-a", c2);
    expect(i1.entities?.heyaUpdates?.get("heya-a")).toEqual(
      i2.entities?.heyaUpdates?.get("heya-a")
    );
  });

  it("logs a CRISIS_RESPONSE event scoped to the heya", () => {
    const { world } = worldWithCrisisHeya();
    const triggered = triggerAndApply(world);
    const crisis = triggered.heyas.get("heya-a")!.activeCrisis!;
    const impact = resolveNPCCrisis(triggered, "heya-a", crisis);
    const events = impact.events ?? [];
    expect(
      events.some((e) => e.type === "CRISIS_RESPONSE" && e.heyaId === "heya-a")
    ).toBe(true);
  });
});
