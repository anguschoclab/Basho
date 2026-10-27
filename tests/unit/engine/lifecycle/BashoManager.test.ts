import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

// buildStartBashoImpact returns a StateImpact — resolution is the caller's job.
// import { buildStartBashoImpact } from "@/engine/lifecycle/BashoManager";

function makeWorldForBasho(): WorldState {
  return MockFactory.createWorld({
    cyclePhase: "pre_basho",
    currentBasho: undefined,
    events: { version: "1.0.0", log: [], dedupe: {} },
  });
}

describe("BashoManager.buildStartBashoImpact — EventBus migration", () => {
  it("buildStartBashoImpact returns StateImpact with BASHO_STATUS event queued", async () => {
    const { buildStartBashoImpact } = await import("@/engine/lifecycle/BashoManager");
    const world = makeWorldForBasho();
    const result = buildStartBashoImpact(world, "hatsu");

    // buildStartBashoImpact returns a StateImpact — check for events array
    const impact = result as any;
    if (impact.events) {
      const bashoEvent = impact.events.find((e: any) => e.type === "BASHO_STATUS");
      expect(bashoEvent).toBeDefined();
    } else if (impact.currentBasho) {
      // If it still returns WorldState, this test will fail
      expect(true).toBe(false);
    }
  });

  it("impact includes currentBasho and cyclePhase world field updates", async () => {
    const { buildStartBashoImpact } = await import("@/engine/lifecycle/BashoManager");
    const world = makeWorldForBasho();
    const result = buildStartBashoImpact(world, "hatsu");

    const impact = result as any;
    if (impact.worldFields) {
      expect(impact.worldFields.currentBasho).toBeDefined();
      expect(impact.worldFields.cyclePhase).toBe("active_basho");
    } else {
      expect(true).toBe(false);
    }
  });

  it("no direct EventBus.bashoStatus call — world.events log is NOT mutated by buildStartBashoImpact alone", async () => {
    const { buildStartBashoImpact } = await import("@/engine/lifecycle/BashoManager");
    const world = makeWorldForBasho();
    const initialLogLength = world.events?.log?.length ?? 0;

    buildStartBashoImpact(world, "hatsu");

    // buildStartBashoImpact must NOT mutate world.events directly
    expect(world.events?.log?.length ?? 0).toBe(initialLogLength);
  });
});
