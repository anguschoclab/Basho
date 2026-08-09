import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

// We'll import startBasho after migration. For now, test the current behavior.
// import { startBasho } from "@/engine/lifecycle/BashoManager";

function makeWorldForBasho(): WorldState {
  return MockFactory.createWorld({
    cyclePhase: "pre_basho",
    currentBasho: undefined,
    events: { version: "1.0.0", log: [], dedupe: {} },
  });
}

describe("BashoManager.startBasho — EventBus migration", () => {
  it("startBasho returns StateImpact with BASHO_STATUS event queued", async () => {
    // Dynamic import to allow for the migration
    const { startBasho } = await import("@/engine/lifecycle/BashoManager");
    const world = makeWorldForBasho();
    const result = startBasho(world, "hatsu");

    // After migration, startBasho should return a StateImpact
    // Check for events array
    const impact = result as any;
    if (impact.events) {
      const bashoEvent = impact.events.find((e: any) => e.type === "BASHO_STATUS");
      expect(bashoEvent).toBeDefined();
    } else if (impact.currentBasho) {
      // If it still returns WorldState, this test will fail (RED phase)
      // After migration, it should return StateImpact
      expect(true).toBe(false);
    }
  });

  it("startBasho impact includes currentBasho and cyclePhase world field updates", async () => {
    const { startBasho } = await import("@/engine/lifecycle/BashoManager");
    const world = makeWorldForBasho();
    const result = startBasho(world, "hatsu");

    const impact = result as any;
    if (impact.worldFields) {
      expect(impact.worldFields.currentBasho).toBeDefined();
      expect(impact.worldFields.cyclePhase).toBe("active_basho");
    } else {
      // RED phase — fails until migrated
      expect(true).toBe(false);
    }
  });

  it("no direct EventBus.bashoStatus call — world.events log is NOT mutated by startBasho alone", async () => {
    const { startBasho } = await import("@/engine/lifecycle/BashoManager");
    const world = makeWorldForBasho();
    const initialLogLength = world.events?.log?.length ?? 0;

    startBasho(world, "hatsu");

    // After migration, startBasho should NOT mutate world.events directly
    expect(world.events?.log?.length ?? 0).toBe(initialLogLength);
  });
});
