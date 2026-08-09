import { describe, it, expect } from "vitest";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("yokozuna promotion in AutoSim", () => {
  it("appends careerHistory entry for each sekitori after every basho in AutoSim", () => {
    const world = generateInitialWorld("career-history-test-001");
    const ozeki = Array.from(world.rikishi.values()).find(
      (r) => r.rank === "ozeki" && !r.isRetired
    );
    expect(ozeki).toBeDefined();

    const result = runAutoSim(world, {
      duration: { type: "basho", count: 3 },
      stopConditions: ["never"],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });

    // A rikishi who retires during the sim is archived to historicalRikishi, so look in both.
    const updatedOzeki =
      result.finalWorld.rikishi.get(ozeki!.id) ??
      result.finalWorld.historicalRikishi?.get(ozeki!.id);
    // After 3 basho, careerHistory should have at least 3 entries for sekitori
    expect(updatedOzeki?.careerHistory?.length).toBeGreaterThanOrEqual(3);
  }, 60000);
});
