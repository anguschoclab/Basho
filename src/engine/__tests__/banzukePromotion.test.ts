import { describe, it, expect } from "vitest";
import { runAutoSim } from "../simulation/AutoSimService";
import { generateInitialWorld } from "../systems/generation/WorldFactory";

describe("yokozuna promotion in AutoSim", () => {
  it("appends careerHistory entry for each sekitori after every basho in AutoSim", () => {
    const world = generateInitialWorld("career-history-test-001");
    const ozeki = Array.from(world.rikishi.values()).find(r => r.rank === "ozeki" && !r.isRetired);
    expect(ozeki).toBeDefined();

    const result = runAutoSim(world, {
      duration: { type: "basho", count: 3 },
      stopConditions: ["never"],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });

    const updatedOzeki = result.finalWorld.rikishi.get(ozeki!.id);
    // After 3 basho, careerHistory should have at least 3 entries for sekitori
    expect(updatedOzeki?.careerHistory?.length).toBeGreaterThanOrEqual(3);
  }, 60000);

  it("has yokozuna or yokozuna promotion event within 12 basho from a world with 0 yokozuna", () => {
    const world = generateInitialWorld("no-yokozuna-test-001");
    // Force all yokozuna to retired state
    const rikishiMap = new Map(world.rikishi);
    for (const [id, r] of rikishiMap) {
      if (r.rank === "yokozuna") {
        rikishiMap.set(id, { ...r, isRetired: true });
      }
    }
    const worldNoYokozuna = { ...world, rikishi: rikishiMap };

    const result = runAutoSim(worldNoYokozuna, {
      duration: { type: "basho", count: 12 },
      stopConditions: ["yokozunaPromotion"],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });

    // Either the simulation stopped early due to promotion,
    // or we have an active yokozuna after 12 basho (Case 4 prestige promotion)
    const activeYokozuna = Array.from(result.finalWorld.rikishi.values())
      .filter(r => r.rank === "yokozuna" && !r.isRetired);
    const stoppedByPromotion = result.stoppedBy === "yokozunaPromotion";
    expect(stoppedByPromotion || activeYokozuna.length > 0).toBe(true);
  }, 120000);
});
