import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { makeMockWorld } from "../utils";

/**
 * P4.18: TransientContext serialization tests.
 * Verifies that transientContext is excluded from serialization
 * and rebuilt on deserialization.
 */

describe("P3.5: transientContext serialization", () => {
  it("serializeWorld does not include transientContext", () => {
    const world = makeMockWorld({
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: false },
        activeModifiers: { test: true },
      } as any,
    });

    const serialized = SerializationService.serializeWorld(world);
    expect((serialized as any).transientContext).toBeUndefined();
  });

  it("deserializeWorld produces a world with transientContext (rebuilt)", () => {
    const world = makeMockWorld();
    const serialized = SerializationService.serializeWorld(world);
    const deserialized = SerializationService.deserializeWorld(serialized);

    // transientContext should be rebuilt by phase02_context
    expect(deserialized.transientContext).toBeDefined();
  });

  it("transientContext.boundaries is not stale after load", () => {
    const world = makeMockWorld({
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: true },
      } as any,
    });

    const serialized = SerializationService.serializeWorld(world);
    const deserialized = SerializationService.deserializeWorld(serialized);

    // The rebuilt transientContext should not have stale boundaries from save time
    if (deserialized.transientContext?.boundaries) {
      // Boundaries should be freshly computed, not the saved ones
      expect(deserialized.transientContext.boundaries).not.toEqual({
        monthBoundary: true,
        yearBoundary: true,
      });
    }
  });
});
