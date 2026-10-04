import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("SerializationService — allTimeKimariteStats round-trip", () => {
  it("preserves allTimeKimariteStats through a serialize/deserialize round-trip", () => {
    const world = MockFactory.createWorld({
      globalKimariteStats: { yorikiri: 40, uwatenage: 10 },
      allTimeKimariteStats: { yorikiri: 400, uwatenage: 120, tsutaezori: 2 },
    });

    const serialized = SerializationService.serializeWorld(world);
    expect(serialized.allTimeKimariteStats).toEqual({
      yorikiri: 400,
      uwatenage: 120,
      tsutaezori: 2,
    });

    const deserialized = SerializationService.deserializeWorld(serialized);
    expect(deserialized.allTimeKimariteStats).toEqual({
      yorikiri: 400,
      uwatenage: 120,
      tsutaezori: 2,
    });
    // Era stats are untouched by the new field.
    expect(deserialized.globalKimariteStats).toEqual({ yorikiri: 40, uwatenage: 10 });
  });

  it("defaults to an empty map for saves written before 1.4.0", () => {
    const world = MockFactory.createWorld({});
    const serialized = SerializationService.serializeWorld(world);
    delete serialized.allTimeKimariteStats;

    const deserialized = SerializationService.deserializeWorld(serialized);
    expect(deserialized.allTimeKimariteStats).toEqual({});
  });
});
