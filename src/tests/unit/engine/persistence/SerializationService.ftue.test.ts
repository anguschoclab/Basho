import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("SerializationService — ftue round-trip", () => {
  it("preserves ftue state through a serialize/deserialize round-trip", () => {
    const world = MockFactory.createWorld({
      ftue: { isActive: true, bashoCompleted: 2, suppressedEvents: ["welcome"] },
    });

    const serialized = SerializationService.serializeWorld(world);
    expect(serialized.ftue).toEqual({
      isActive: true,
      bashoCompleted: 2,
      suppressedEvents: ["welcome"],
    });

    const deserialized = SerializationService.deserializeWorld(serialized);
    expect(deserialized.ftue).toEqual({
      isActive: true,
      bashoCompleted: 2,
      suppressedEvents: ["welcome"],
    });
  });

  it("preserves an inactive ftue state (not just truthy defaults)", () => {
    const world = MockFactory.createWorld({
      ftue: { isActive: false, bashoCompleted: 5, suppressedEvents: [] },
    });

    const serialized = SerializationService.serializeWorld(world);
    const deserialized = SerializationService.deserializeWorld(serialized);

    expect(deserialized.ftue?.isActive).toBe(false);
    expect(deserialized.ftue?.bashoCompleted).toBe(5);
  });
});
