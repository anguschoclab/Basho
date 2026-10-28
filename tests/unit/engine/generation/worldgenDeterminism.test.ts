import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { BardEngine } from "@/engine/bard/BardEngine";

/**
 * V14-B09: BardEngine's anti-repetition lanes (lruBySeed) are module-global
 * and keyed by rng.seed — a second same-seed world in the same process
 * inherits the first world's lane, consumes extra rng draws inside resolve,
 * and diverges the whole simulation (determinism-double-run byte 358:
 * reputation/funds). World-lifetime boundaries must reset the lanes, same
 * as resetImpactTimestampCounter.
 */
describe("world-lifetime boundary resets bard anti-repetition lanes", () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(BardEngine, "resetCache");
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it("generateInitialWorld clears the lanes so a new same-seed world starts clean", () => {
    generateInitialWorld("bard-lane-boundary");
    expect(spy).toHaveBeenCalled();
  });

  it("deserializeWorld clears the lanes so a loaded world replays deterministically", () => {
    const world = generateInitialWorld("bard-lane-deserialize");
    spy.mockClear();
    const serialized = SerializationService.serializeWorld(world);
    SerializationService.deserializeWorld(serialized);
    expect(spy).toHaveBeenCalled();
  });
});
