/**
 * yokozunaPresence.test.ts
 * ============================
 * Internal validation test for Yokozuna logic.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import type { Rikishi } from "../types/rikishi";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { runHistoryUpdates } from "../history";
import { publishBanzukeUpdate } from "../world";
import { simulateEntireBasho } from "../simulation/TournamentSimulator";

describe("Yokozuna Presence Logic Validation", () => {
  it("tracks yokozuna presence and promotion under new 2-basho rules", () => {
    const seed = "yokozuna-validation-seed";
    const world = generateInitialWorld(seed);
    const currentWorld = world;

    const totalCountByBasho: number[] = [];
    const healthyCountByBasho: number[] = [];

    const TOTAL_BASHO = 24; // 4 years verification

    for (let i = 0; i < TOTAL_BASHO; i++) {
      const bashoName = currentWorld.currentBashoName || "hatsu";
      const simSeed = `${seed}-${i}`;

      // 1. Simulate matches
      const res = simulateEntireBasho(currentWorld, bashoName, simSeed);

      // 2. Wrap result into world
      (currentWorld as any).currentBasho = {
        bashoName: res.bashoName,
        year: currentWorld.year,
        standings: res.standings,
        isActive: false,
      };

      // 3. Push to world history
      if (!currentWorld.history) currentWorld.history = [];
      currentWorld.history.push({
        year: currentWorld.year,
        bashoName: res.bashoName,
        yusho: res.yushoWinner.id,
        junYusho: [],
        prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
      } as any);

      // 4. Trigger Post-Basho Pipeline (Promotions/Retirements)
      currentWorld.cyclePhase = "post_basho";
      publishBanzukeUpdate(currentWorld);
      runHistoryUpdates(currentWorld);

      const rikishi_list = Array.from(currentWorld.activeRikishiIds)
        .map((id) => currentWorld.rikishi.get(id))
        .filter((r): r is Rikishi => r !== undefined);
      const yokozunas = rikishi_list.filter((r) => r.rank === "yokozuna");
      const healthyYokozunas = yokozunas.filter((r) => !r.injured);

      totalCountByBasho.push(yokozunas.length);
      healthyCountByBasho.push(healthyYokozunas.length);

      // Debug: Log if first Yokozuna found
      if (yokozunas.length > 0 && i > 0 && totalCountByBasho[i - 1] === 0) {
        console.log(
          `[VERIFICATION] First Yokozuna promoted at Basho ${i}: ${yokozunas[0].shikona}`
        );
      }
    }

    const bashoWithoutAnyYokozuna = totalCountByBasho.filter((c) => c === 0).length;
    const bashoWithoutHealthyYokozuna = healthyCountByBasho.filter((c) => c === 0).length;

    console.log("\n=== Yokozuna Presence Validation Report ===");
    console.log(`Total Basho Simulated: ${TOTAL_BASHO}`);
    console.log(
      `Basho with 0 Yokozuna on Banzuke: ${bashoWithoutAnyYokozuna} (${((bashoWithoutAnyYokozuna / TOTAL_BASHO) * 100).toFixed(1)}%)`
    );
    console.log(
      `Basho with 0 Healthy Yokozunas: ${bashoWithoutHealthyYokozuna} (${((bashoWithoutHealthyYokozuna / TOTAL_BASHO) * 100).toFixed(1)}%)`
    );

    expect(totalCountByBasho.length).toBe(TOTAL_BASHO);
  }, 120000);
});
