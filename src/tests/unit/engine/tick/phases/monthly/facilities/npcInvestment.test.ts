import { describe, it, expect } from "vitest";
import { processNpcAutoInvestment } from "../../../../../../../engine/tick/phases/monthly/facilities/npcInvestment";
import { MockFactory } from "../../../../../../helpers/utils/MockFactory";
import { createImpactBuilder } from "../../../../../../../engine/core/ImpactBuilder";
import {
  NPC_INVESTMENT_RUNWAY_THRESHOLD,
  MAX_FACILITY_LEVEL,
} from "../../../../../../../constants/engine/facilities";
import type { HeyaUpdates } from "../../../../../../../engine/tick/phases/monthly/types";

describe("processNpcAutoInvestment", () => {
  it("should not invest for player heya", () => {
    const world = MockFactory.createWorld();
    world.playerHeyaId = "heya1";
    const heya = MockFactory.createHeya("heya1", {
      funds: 100_000_000,
      facilities: { training: 10, recovery: 10, nutrition: 10 },
    });
    const heyaUpdates: HeyaUpdates = {};
    const builder = createImpactBuilder("test");

    processNpcAutoInvestment(world, heya, 1000, 1000, heyaUpdates, builder);

    expect(heyaUpdates.facilities).toBeUndefined();
    expect(heyaUpdates.funds).toBeUndefined();
    const events = builder.build().events || [];
    expect(events.length).toBe(0);
  });

  it("should not invest if runway <= threshold", () => {
    const world = MockFactory.createWorld();
    world.playerHeyaId = "player1";
    const monthlyBurn = 10_000_000;
    const funds = monthlyBurn * NPC_INVESTMENT_RUNWAY_THRESHOLD;
    const heya = MockFactory.createHeya("heya1", {
      funds,
      facilities: { training: 10, recovery: 10, nutrition: 10 },
    });
    const heyaUpdates: HeyaUpdates = {};
    const builder = createImpactBuilder("test");

    processNpcAutoInvestment(world, heya, monthlyBurn, 0, heyaUpdates, builder);

    expect(heyaUpdates.facilities).toBeUndefined();
    expect(heyaUpdates.funds).toBeUndefined();
  });

  it("should invest in the weakest facility if runway > threshold", () => {
    const world = MockFactory.createWorld();
    world.playerHeyaId = "player1";
    const monthlyBurn = 100_000;
    const funds = 100_000_000; // Lots of money
    const heya = MockFactory.createHeya("heya1", {
      funds,
      facilities: { training: 15, recovery: 10, nutrition: 12 },
      name: "Rich Heya",
    });
    const heyaUpdates: HeyaUpdates = { funds };
    const builder = createImpactBuilder("test");

    processNpcAutoInvestment(world, heya, monthlyBurn, 0, heyaUpdates, builder);

    expect(heyaUpdates.facilities).toBeDefined();
    // It should pick 'recovery' as it is the weakest at 10
    expect(heyaUpdates.facilities!.recovery).toBeGreaterThan(10);
    expect(heyaUpdates.funds).toBeLessThan(funds);

    const impact = builder.build();
    const events = impact.events || [];
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("FACILITY_UPGRADED");
    expect(events[0].data.axis).toBe("recovery");
  });

  it("should not invest beyond MAX_FACILITY_LEVEL", () => {
    const world = MockFactory.createWorld();
    world.playerHeyaId = "player1";
    const monthlyBurn = 100_000;
    const funds = 1_000_000_000; // infinite money
    const heya = MockFactory.createHeya("heya1", {
      funds,
      facilities: { training: 99, recovery: 100, nutrition: 100 },
    });
    const heyaUpdates: HeyaUpdates = { funds };
    const builder = createImpactBuilder("test");

    processNpcAutoInvestment(world, heya, monthlyBurn, 0, heyaUpdates, builder);

    expect(heyaUpdates.facilities).toBeDefined();
    expect(heyaUpdates.facilities!.training).toBe(MAX_FACILITY_LEVEL);
  });
});
