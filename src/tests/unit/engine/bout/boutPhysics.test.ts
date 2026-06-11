import { describe, it, expect } from "vitest";
import { resolveBoutPhysics } from "@/engine/bout/boutPhysics";
import { mockRikishi, makeMockBasho } from "../utils";

describe("boutPhysics", () => {
  describe("resolveBoutPhysics", () => {
    it("returns a valid BoutResult", () => {
      const bout = { id: "test-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
      const east = mockRikishi("r1");
      const west = mockRikishi("r2");
      const basho = makeMockBasho();
      const { result } = resolveBoutPhysics(bout, east, west, basho);
      expect(result).toBeDefined();
      expect(result.winner).toBeDefined();
      expect(result.kimarite).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it("is deterministic with same seed", () => {
      const bout = { id: "test-002", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
      const east = mockRikishi("r1");
      const west = mockRikishi("r2");
      const basho = makeMockBasho();
      const results = Array.from({ length: 5 }, () => resolveBoutPhysics(bout, east, west, basho));
      for (let i = 1; i < results.length; i++) {
        expect(results[i].result.winner).toBe(results[0].result.winner);
        expect(results[i].result.kimarite).toBe(results[0].result.kimarite);
      }
    });

    it("returns a valid KimariteId", () => {
      const bout = { id: "test-003", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
      const east = mockRikishi("r1");
      const west = mockRikishi("r2");
      const basho = makeMockBasho();
      const { result } = resolveBoutPhysics(bout, east, west, basho);
      expect(result.kimarite).toBeTruthy();
      expect(typeof result.kimarite).toBe("string");
    });

    it("winner side is east or west", () => {
      const bout = { id: "test-004", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
      const east = mockRikishi("r1");
      const west = mockRikishi("r2");
      const basho = makeMockBasho();
      const { result } = resolveBoutPhysics(bout, east, west, basho);
      expect(["east", "west"]).toContain(result.winner);
    });

    it("duration is within 1–240 seconds", () => {
      const bout = { id: "test-005", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
      const east = mockRikishi("r1");
      const west = mockRikishi("r2");
      const basho = makeMockBasho();
      const { result } = resolveBoutPhysics(bout, east, west, basho);
      expect(result.duration).toBeGreaterThanOrEqual(1);
      expect(result.duration).toBeLessThanOrEqual(240);
    });

    it("does not exceed 120 ticks", () => {
      const bout = { id: "test-006", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
      const east = mockRikishi("r1");
      const west = mockRikishi("r2");
      const basho = makeMockBasho();
      const { result } = resolveBoutPhysics(bout, east, west, basho);
      // Duration is tick * 2 seconds
      expect(result.duration).toBeLessThanOrEqual(240);
    });
  });
});
