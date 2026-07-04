import { describe, it, expect } from "vitest";
import { processDramaTick } from "@/engine/bard/dramaGenerator";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";

describe("dramaGenerator", () => {
  describe("processDramaTick", () => {
    it("returns a StateImpact without throwing on empty world", () => {
      const world = makeMockWorld();
      const result = processDramaTick(world);
      expect(result).toBeTruthy();
    });

    it("handles empty activeRikishiIds set gracefully", () => {
      const world = makeMockWorld({ activeRikishiIds: new Set() });
      const result = processDramaTick(world);
      expect(result).toBeTruthy();
    });

    it("handles activeRikishiIds with IDs not in rikishi map (filtered out)", () => {
      const world = makeMockWorld({
        activeRikishiIds: new Set(["ghost1", "ghost2"]),
        rikishi: new Map(),
      });
      const result = processDramaTick(world);
      expect(result).toBeTruthy();
    });

    it("processes scandal event path with valid active rikishi", () => {
      const r1 = mockRikishi("r1", { heyaId: "h1" });
      const r2 = mockRikishi("r2", { heyaId: "h1" });
      const heya = makeMockHeya("h1");
      const world = makeMockWorld({
        rikishi: new Map([
          ["r1", r1],
          ["r2", r2],
        ]),
        heyas: new Map([["h1", heya]]),
      });
      // Run multiple times to hit different eventType branches
      for (let i = 0; i < 20; i++) {
        const w = { ...world, week: i + 1 } as WorldState;
        const result = processDramaTick(w);
        expect(result).toBeTruthy();
      }
    });

    it("handles mixed valid and invalid IDs in activeRikishiIds", () => {
      const r1 = mockRikishi("r1", { heyaId: "h1" });
      const heya = makeMockHeya("h1");
      const world = makeMockWorld({
        rikishi: new Map([["r1", r1]]),
        heyas: new Map([["h1", heya]]),
        activeRikishiIds: new Set(["r1", "missing1", "missing2"]),
      });
      // Run multiple times to hit scandal branch which iterates activeRikishiIds
      for (let i = 0; i < 20; i++) {
        const w = { ...world, week: i + 1 } as WorldState;
        const result = processDramaTick(w);
        expect(result).toBeTruthy();
      }
    });
  });
});
