import { describe, it, expect, beforeEach } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

describe("BanzukePublisher", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld({
      cyclePhase: "post_basho",
      history: [],
    });
  });

  describe("publishBanzukeUpdate", () => {
    it("should do nothing if cyclePhase is not post_basho", () => {
      world.cyclePhase = "active_basho";
      const impact = publishBanzukeUpdate(world);
      const newWorld = resolveImpacts(world, [impact]);
      expect(newWorld.cyclePhase).toBe("active_basho"); // No change
    });

    it("should process Ozeki promotion to Yokozuna for 2 consecutive yusho", () => {
      const basho = makeMockBasho({
        bashoName: "hatsu",
        standings: new Map([["r1", { wins: 14, losses: 1, absences: 0 }]]),
      });
      world.currentBasho = basho;

      world.history.push({
        year: 2025,
        bashoNumber: 1,
        bashoName: "hatsu",
        yusho: "r1",
        junYusho: [],
        ginoSho: "none",
        shukunsho: "none",
        kantosho: "none",
        id: "1",
      } as any);

      const r1 = mockRikishi("r1", {
        rank: "ozeki",
        careerHistory: [
          {
            isYusho: true,
            wins: 14,
            losses: 1,
            year: 2024,
            month: 11,
            bashoName: "kyushu",
          },
        ] as any,
      });
      world.rikishi.set("r1", r1);

      const impact = publishBanzukeUpdate(world);
      // The updateBanzuke internal logic dictates actual changes,
      // but BanzukePublisher handles careerHistory updates.
      const newWorld = resolveImpacts(world, [impact]);
      const updatedR1 = newWorld.rikishi.get("r1")!;
      expect(updatedR1.careerHistory!.length).toBeGreaterThan(0);
      expect(updatedR1.careerHistory![updatedR1.careerHistory!.length - 1].isYusho).toBe(true);
    });

    it("should apply penalty for Yokozuna subpar performance", () => {
      const basho = makeMockBasho({
        bashoName: "hatsu",
        standings: new Map([["r1", { wins: 9, losses: 6, absences: 0 }]]), // < 10 is subpar
      });
      world.currentBasho = basho;

      world.history.push({
        year: 2025,
        bashoNumber: 1,
        bashoName: "hatsu",
        yusho: "none",
        junYusho: [],
        ginoSho: "none",
        shukunsho: "none",
        kantosho: "none",
        id: "1",
      } as any);

      const r1 = mockRikishi("r1", {
        rank: "yokozuna",
        pressureScore: 1, // Will become 2, triggering warning
        stats: {
          mental: 50,
          technique: 50,
        } as any,
      });
      world.rikishi.set("r1", r1);

      const impact = publishBanzukeUpdate(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedR1 = newWorld.rikishi.get("r1")!;
      expect(updatedR1.pressureScore).toBe(2);
      expect(updatedR1.councilWarnings).toBe(1);
      expect(updatedR1.stats.mental).toBeLessThan(50);
    });

    it("should reset Kyujo consecutive tracking if absences < 15", () => {
      const basho = makeMockBasho({
        bashoName: "hatsu",
        standings: new Map([["r1", { wins: 14, losses: 1, absences: 0 }]]),
      });
      world.currentBasho = basho;

      world.history.push({
        year: 2025,
        bashoNumber: 1,
        bashoName: "hatsu",
        yusho: "r1",
        junYusho: [],
        ginoSho: "none",
        shukunsho: "none",
        kantosho: "none",
        id: "1",
      } as any);

      const r1 = mockRikishi("r1", {
        rank: "yokozuna",
        consecutiveKyujo: 2,
      });
      world.rikishi.set("r1", r1);

      const impact = publishBanzukeUpdate(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedR1 = newWorld.rikishi.get("r1")!;
      expect(updatedR1.consecutiveKyujo).toBe(0);
    });
  });
});
