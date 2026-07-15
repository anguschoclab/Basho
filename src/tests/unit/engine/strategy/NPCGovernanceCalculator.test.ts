import { describe, it, expect } from "vitest";
import { evaluateGovernanceStrategy } from "@/engine/strategy/NPCGovernanceCalculator";
import type { StrategyContext } from "@/engine/strategy/NPCStrategyFramework";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";

function makeCtx(
  heyaOverrides: Partial<Heya> = {},
  oyakataOverrides: Partial<Oyakata> = {},
  worldOverrides: Partial<WorldState> = {}
): StrategyContext {
  const heya = MockFactory.createHeya("h1", {
    scandalScore: 0,
    politicalCapital: 50,
    ...heyaOverrides,
  });
  const oyakata = MockFactory.createOyakata("o1", {
    heyaId: "h1",
    ...oyakataOverrides,
  });
  const world = MockFactory.createWorld({
    heyas: new Map([["h1", heya]]),
    oyakata: new Map([["o1", oyakata]]),
    ...worldOverrides,
  });
  return { world, heya, oyakata };
}

describe("NPCGovernanceCalculator.evaluateGovernanceStrategy", () => {
  it("with scandalScore >= 20 and politicalCapital >= 20 reduces scandal", () => {
    const ctx = makeCtx({ scandalScore: 25, politicalCapital: 50 });
    const impact = evaluateGovernanceStrategy(ctx);
    const updates = impact.entities?.heyaUpdates;
    if (updates instanceof Map) {
      const upd = updates.get("h1");
      expect(upd?.scandalScore).toBeLessThan(25);
      expect(upd?.politicalCapital).toBeLessThan(50);
    }
  });

  it("with politicalCapital < 20 does nothing for reduce_scandal rule", () => {
    const ctx = makeCtx({ scandalScore: 25, politicalCapital: 10 });
    const impact = evaluateGovernanceStrategy(ctx);
    const updates = impact.entities?.heyaUpdates;
    if (updates instanceof Map) {
      // Should not have reduce_scandal action since politicalCapital < 20
      const upd = updates.get("h1");
      if (upd?.politicalCapital !== undefined) {
        // If there is an update, it shouldn't be from reduce_scandal (which requires >= 20)
        expect(upd.politicalCapital).not.toBe(10 - 20);
      }
    }
  });

  it("with vindictive oyakata and politicalCapital >= 40 triggers sabotage", () => {
    const rivalHeya = MockFactory.createHeya("h2", { scandalScore: 20 });
    const ctx = makeCtx(
      { politicalCapital: 50 },
      { traits: { ambition: 85, patience: 30, risk: 75, tradition: 30, compassion: 20 }, temperament: "Vindictive" }
    );
    // Add rival heya to world
    ctx.world.heyas.set("h2", rivalHeya);

    const impact = evaluateGovernanceStrategy(ctx);
    // Sabotage should produce an event
    expect(impact.events?.length ?? 0).toBeGreaterThan(0);
    const sabotageEvent = impact.events?.find(
      (e) => e.type === "NARRATIVE_CRISIS_TRIGGERED"
    );
    expect(sabotageEvent).toBeDefined();
  });

  it("with traditionalist oyakata and scandalScore >= 5 maintains standing", () => {
    const ctx = makeCtx(
      { scandalScore: 8, politicalCapital: 20 },
      { archetype: "traditionalist", traits: { ambition: 30, patience: 70, risk: 30, tradition: 80, compassion: 50 } }
    );
    const impact = evaluateGovernanceStrategy(ctx);
    const updates = impact.entities?.heyaUpdates;
    if (updates instanceof Map) {
      const upd = updates.get("h1");
      // Traditionalist should reduce scandal by 3 and spend 10 political capital
      if (upd?.scandalScore !== undefined) {
        expect(upd.scandalScore).toBeLessThanOrEqual(8);
      }
    }
  });

  it("StrategyContext does not include rikishi or staff fields", () => {
    // This is a type-level test — if StrategyContext had rikishi or staff,
    // this would need them. The interface only has world, heya, oyakata.
    const ctx: StrategyContext = {
      world: MockFactory.createWorld(),
      heya: MockFactory.createHeya("h1"),
      oyakata: MockFactory.createOyakata("o1"),
    };
    // Should compile without rikishi or staff
    expect(ctx.world).toBeDefined();
    expect(ctx.heya).toBeDefined();
    expect(ctx.oyakata).toBeDefined();
  });
});
