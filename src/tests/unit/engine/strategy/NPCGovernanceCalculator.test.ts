import { describe, it, expect, beforeEach } from "vitest";
import { evaluateGovernanceStrategy, getGovernanceStrategy } from "../../../../engine/strategy/NPCGovernanceCalculator";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { StrategyContext } from "../../../../engine/strategy/NPCStrategyFramework";



describe("NPCGovernanceCalculator", () => {
  let ctx: StrategyContext;
  let world: any;

  beforeEach(() => {
    world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("heya_1", {
      scandalScore: 0,
      politicalCapital: 0,
    });
    world.heyas.set("heya_1", heya);

    ctx = {
      world,
      heya,
      oyakata: MockFactory.createOyakata("oya_1", { heyaId: "heya_1" }),
      rikishi: [],
      staff: [],
    };
  });

  it("should do nothing if conditions are not met", () => {
    const impact = evaluateGovernanceStrategy(ctx);
    expect(impact.entities?.heyaUpdates?.size ?? 0).toBe(0);
    expect(impact.events?.length ?? 0).toBe(0);
  });

  it("gov_reduce_scandal: should reduce scandal when scandal >= 20 and political capital >= 20", () => {
    ctx.heya.scandalScore = 25;
    ctx.heya.politicalCapital = 25;
    const impact = evaluateGovernanceStrategy(ctx);

    expect(impact.entities?.heyaUpdates?.size ?? 0).toBeGreaterThan(0);
    const updates = impact.entities?.heyaUpdates?.get("heya_1");
    // Default reduction is 5
    expect(updates?.scandalScore).toBe(20);
    expect(updates?.politicalCapital).toBe(5);
  });

  it("gov_reduce_scandal: should reduce scandal by 8 if oyakata is scientist", () => {
    ctx.heya.scandalScore = 25;
    ctx.heya.politicalCapital = 25;
    ctx.oyakata.archetype = "scientist";
    const impact = evaluateGovernanceStrategy(ctx);

    const updates = impact.entities?.heyaUpdates?.get("heya_1");
    expect(updates?.scandalScore).toBe(17);
    expect(updates?.politicalCapital).toBe(5);
  });

  it("gov_sabotage: should sabotage a rival with scandal > 15 if vindictive and capital >= 40", () => {
    ctx.heya.politicalCapital = 45;
    ctx.oyakata.temperament = "Vindictive";

    const rivalHeya = MockFactory.createHeya("heya_rival", { scandalScore: 20 });
    ctx.world.heyas.set("heya_rival", rivalHeya);

    const impact = evaluateGovernanceStrategy(ctx);

    const updates = impact.entities?.heyaUpdates?.get("heya_1");
    expect(updates?.politicalCapital).toBe(15); // 45 - 30

    expect(impact.events?.length).toBeGreaterThan(0);
    const event = impact.events?.find(e => e.data?.heyaId === "heya_rival");
    expect(event?.data?.title).toBe("Leaked Internal Memo");
  });

  it("gov_maintain_standing: should reduce scandal by 3 if traditionalist and scandal >= 5 and capital >= 15", () => {
    ctx.oyakata.traits.tradition = 80; // TraitChecks.isTraditionalist needs > 60 usually
    ctx.heya.scandalScore = 10;
    ctx.heya.politicalCapital = 20;

    const impact = evaluateGovernanceStrategy(ctx);

    const updates = impact.entities?.heyaUpdates?.get("heya_1");
    expect(updates?.politicalCapital).toBe(10); // 20 - 10
    expect(updates?.scandalScore).toBe(7); // 10 - 3
  });

  it("should get fallback governance strategy for unknown archetype", () => {
    const strategy = getGovernanceStrategy("unknown_archetype" as any);
    expect(strategy).toBe(evaluateGovernanceStrategy);
  });
});
