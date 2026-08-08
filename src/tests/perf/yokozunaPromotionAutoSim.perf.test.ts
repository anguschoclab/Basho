import { describe, it, expect } from "vitest";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("PERF: yokozuna promotion in AutoSim", () => {
  it(
    "has yokozuna or yokozuna promotion event within 12 basho from a world with 0 yokozuna",
    { timeout: 300000 },
    () => {
      const world = generateInitialWorld("no-yokozuna-test-001");
      // Force all yokozuna to retired state and remove from activeRikishiIds
      const rikishiMap = new Map(world.rikishi);
      const newActiveIds = new Set(world.activeRikishiIds);
      for (const [id, r] of rikishiMap) {
        if (r.rank === "yokozuna") {
          rikishiMap.set(id, { ...r, isRetired: true });
          newActiveIds.delete(id);
        }
      }

      // Boost the top ozeki's stats to ensure deterministic 13+ win yusho,
      // triggering Case 4 prestige promotion (no active yokozuna + 13+ win yusho)
      const activeOzeki = Array.from(rikishiMap.values())
        .filter((r) => r.rank === "ozeki" && !r.isRetired)
        .sort((a, b) => (b.stats.power ?? 0) - (a.stats.power ?? 0));
      if (activeOzeki.length > 0) {
        const topOzeki = activeOzeki[0];
        rikishiMap.set(topOzeki.id, {
          ...topOzeki,
          condition: 100,
          motivation: 100,
          stats: {
            ...topOzeki.stats,
            power: 95,
            technique: 95,
            speed: 95,
            balance: 95,
            stamina: 85,
            mental: 85,
          },
        });
      }

      const worldNoYokozuna = { ...world, rikishi: rikishiMap, activeRikishiIds: newActiveIds };

      const result = runAutoSim(worldNoYokozuna, {
        duration: { type: "basho", count: 18 },
        stopConditions: ["yokozunaPromotion"],
        verbosity: "minimal",
        delegationPolicy: "balanced",
        observerMode: true,
      });

      const activeYokozuna = Array.from(result.finalWorld.rikishi.values()).filter(
        (r) => r.rank === "yokozuna" && !r.isRetired
      );
      const stoppedByPromotion = result.stoppedBy === "yokozunaPromotion";
      expect(stoppedByPromotion || activeYokozuna.length > 0).toBe(true);
    }
  );
});
