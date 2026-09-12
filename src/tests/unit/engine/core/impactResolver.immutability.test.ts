import { describe, it, expect } from "vitest";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

/**
 * V5-B11 regression: resolveImpacts shallow-copies the world
 * (`result = { ...world }`), so `result.events` aliases the input world's
 * events object. logEngineEvent then pushes into that shared `events.log`,
 * mutating the input world — violating the resolver's immutability contract
 * ("Sequentially applies immutable patches", ImpactResolver.ts:401).
 *
 * Post-fix contract: resolving an impact that queues events must NOT mutate
 * the input world's events state.
 */
describe("resolveImpacts event immutability (V5-B11)", () => {
  it("does not mutate the input world's events.log", () => {
    const world = MockFactory.createWorld({
      events: { version: "1.0.0", log: [], dedupe: {} },
    });
    const logRef = world.events!.log;
    const before = logRef.length;

    const impact = createImpactBuilder("test")
      .logEvent("PHASE_TRANSITION", "misc", { from: "interim", to: "pre_basho" })
      .build();
    const next = resolveImpacts(world, [impact]);

    // The returned world must contain the new event…
    expect(next.events!.log.length).toBe(before + 1);
    // …but the INPUT world's log must be untouched.
    expect(world.events!.log.length).toBe(before);
    expect(world.events!.log).toBe(logRef);
  });

  it("does not mutate the input world's events.dedupe map", () => {
    const world = MockFactory.createWorld({
      events: { version: "1.0.0", log: [], dedupe: {} },
    });
    const dedupeRef = world.events!.dedupe;

    const impact = createImpactBuilder("test")
      .logEvent("PHASE_TRANSITION", "misc", { from: "interim", to: "pre_basho" })
      .build();
    resolveImpacts(world, [impact]);

    expect(Object.keys(world.events!.dedupe)).toHaveLength(0);
    expect(world.events!.dedupe).toBe(dedupeRef);
  });
});
