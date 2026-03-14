import { describe, it, expect } from "vitest";
import { runAutoSim } from "../autoSim";
import { generateWorld } from "../worldgen";
import type { AutoSimConfig } from "../autoSim";

describe("AutoSim", () => {
  it("should simulate an entire basho deterministically", { timeout: 10000 }, () => {
    const world = generateWorld("test-autosim-seed");

    // We mock current basho initialization manually to mirror startBasho behavior,
    // or just rely on runAutoSim to do it.
    world.year = 2025;
    world.currentBashoName = "hatsu";

    const config: AutoSimConfig = {
        duration: { type: "basho", count: 1 },
        stopConditions: ["never"],
        verbosity: "minimal",
        pauseForScandals: false
    };

    const result = runAutoSim(world, config);

    expect(result.bashoSimulated).toBe(1);
    expect(result.daysSimulated).toBe(15);
    expect(result.stoppedBy).toBe("completed");

    // Check that we got a champion in the chronicle
    expect(result.chronicle.topChampions.length).toBeGreaterThan(0);
    expect(result.chronicle.topChampions[0].yushoCount).toBeGreaterThan(0);
  });
});
