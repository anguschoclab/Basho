import { describe, it, expect } from "vitest";
import { processFacilitiesMaintenance } from "../../../../../../../engine/tick/phases/monthly/facilities/maintenance";
import { MockFactory } from "../../../../../../helpers/utils/MockFactory";
import { createImpactBuilder } from "../../../../../../../engine/core/ImpactBuilder";
import {
  MAINTENANCE_COST_PER_POINT,
  MIN_FACILITY_LEVEL,
  FACILITY_DECAY_AMOUNT,
} from "../../../../../../../constants/engine/facilities";
import type { HeyaUpdates } from "../../../../../../../engine/tick/phases/monthly/types";

describe("processFacilitiesMaintenance", () => {
  it("should deduct maintenance from funds when funds are sufficient", () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("heya1", {
      funds: 1000000,
      facilities: { training: 10, recovery: 10, nutrition: 10 },
    });
    const heyaUpdates: HeyaUpdates = {};
    const builder = createImpactBuilder("test");

    const maintenanceCost = processFacilitiesMaintenance(world, heya, heyaUpdates, builder);

    const expectedCost = (10 + 10 + 10) * MAINTENANCE_COST_PER_POINT;
    expect(maintenanceCost).toBe(expectedCost);
    expect(heyaUpdates.funds).toBe(1000000 - expectedCost);
    expect(heyaUpdates.facilities).toBeUndefined();
  });

  it("should decay facilities and log event when funds are insufficient", () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("heya2", {
      funds: 0,
      facilities: { training: 20, recovery: 20, nutrition: 20 },
      name: "Poor Heya",
    });
    const heyaUpdates: HeyaUpdates = {};
    const builder = createImpactBuilder("test");

    const maintenanceCost = processFacilitiesMaintenance(world, heya, heyaUpdates, builder);

    const expectedCost = (20 + 20 + 20) * MAINTENANCE_COST_PER_POINT;
    expect(maintenanceCost).toBe(expectedCost);
    expect(heyaUpdates.funds).toBeUndefined();
    expect(heyaUpdates.facilities).toBeDefined();
    expect(heyaUpdates.facilities!.training).toBe(20 - FACILITY_DECAY_AMOUNT);
    expect(heyaUpdates.facilities!.recovery).toBe(20 - FACILITY_DECAY_AMOUNT);
    expect(heyaUpdates.facilities!.nutrition).toBe(20 - FACILITY_DECAY_AMOUNT);

    const impact = builder.build();
    const events = impact.events || [];
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("FACILITY_DEGRADED");
  });

  it("should not decay facilities below MIN_FACILITY_LEVEL", () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("heya3", {
      funds: 0,
      facilities: {
        training: MIN_FACILITY_LEVEL,
        recovery: MIN_FACILITY_LEVEL + 1,
        nutrition: MIN_FACILITY_LEVEL,
      },
    });
    const heyaUpdates: HeyaUpdates = {};
    const builder = createImpactBuilder("test");

    processFacilitiesMaintenance(world, heya, heyaUpdates, builder);

    expect(heyaUpdates.facilities!.training).toBe(MIN_FACILITY_LEVEL);
    expect(heyaUpdates.facilities!.recovery).toBe(
      Math.max(MIN_FACILITY_LEVEL, MIN_FACILITY_LEVEL + 1 - FACILITY_DECAY_AMOUNT)
    );
    expect(heyaUpdates.facilities!.nutrition).toBe(MIN_FACILITY_LEVEL);
  });
});
