import { describe, it, expect } from "vitest";
import { CrisisService } from "@/engine/systems/narrative/CrisisService";
import { evaluatePendingDecisions } from "@/engine/loop/LoopDecisionEngine";
import { checkTriggeredDrama } from "@/engine/bard/dramaGenerator";
import { applyImpact } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

/**
 * Regression: crises/decisions stored in world state must be
 * structuredClone-able — the worker posts WORLD_UPDATED via postMessage
 * (structured clone) and ticks clone the input world. A stored
 * `impactGenerator` function wedged the entire sim: postMessage threw,
 * the world never synced, and every subsequent tick died cloning.
 */
function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return MockFactory.createWorld({
    playerHeyaId: "h1",
    cyclePhase: "interim",
    week: 3,
    ...overrides,
  }) as WorldState;
}

describe("world-stored crises are serializable", () => {
  it("checkForWeeklyCrisis stores a cloneable pendingCrisis (no impactGenerator)", () => {
    // Force the roll by probing weeks until a crisis fires, or construct
    // the stored shape directly via the impact the service produces.
    let stored: WorldState["pendingCrisis"] | undefined;
    for (let week = 1; week <= 60 && !stored; week++) {
      const world = makeWorld({ week });
      const impact = CrisisService.checkForWeeklyCrisis(world);
      stored = impact.worldFields?.pendingCrisis;
    }
    expect(stored, "no crisis rolled across 60 weeks — check trigger probability").toBeDefined();
    expect(() => structuredClone(stored)).not.toThrow();
    for (const opt of stored!.options) {
      expect(
        opt.impactGenerator,
        "stored crisis options must not carry functions"
      ).toBeUndefined();
    }
  });

  it("evaluatePendingDecisions stores a cloneable pendingCrisis for blocking decisions", () => {
    const heya = MockFactory.createHeya("h1", { runwayBand: "desperate" } as never);
    const world = makeWorld({ heyas: new Map([["h1", heya]]) });
    const impact = evaluatePendingDecisions(world);
    const stored = impact.worldFields?.pendingCrisis;
    expect(stored, "desperate runway must produce a blocking decision").toBeDefined();
    expect(() => structuredClone(stored)).not.toThrow();
    for (const opt of stored!.options) {
      expect(opt.impactGenerator).toBeUndefined();
    }
  });

  it("triggerCrisis stores a cloneable activeCrisis on the heya", () => {
    const heya = MockFactory.createHeya("heya-a", { funds: -1000 });
    const oyakata = MockFactory.createOyakata("oya-a", { heyaId: "heya-a" });
    const world = makeWorld({
      heyas: new Map([["heya-a", heya]]),
      oyakata: new Map([["oya-a", oyakata]]),
    });
    const triggered = applyImpact(world, checkTriggeredDrama(world));
    const crisis = triggered.heyas.get("heya-a")?.activeCrisis;
    expect(crisis, "insolvent heya must get an activeCrisis").toBeDefined();
    expect(() => structuredClone(crisis)).not.toThrow();
    for (const opt of crisis!.options) {
      expect(opt.impactGenerator).toBeUndefined();
    }
  });
});
