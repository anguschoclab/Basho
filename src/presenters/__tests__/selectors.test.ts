import { describe, it, expect } from "vitest";
import { selectYokozunaCandidates } from "../selectors";
import { mockRikishi } from "../../engine/__tests__/utils";
import type { WorldState } from "../../engine/types/world";
import type { Rikishi } from "../../engine/types/rikishi";

describe("selectors", () => {
  describe("selectYokozunaCandidates", () => {
    it("should return an empty array if the world has no rikishi", () => {
      const world = {
        rikishi: new Map<string, Rikishi>(),
      } as unknown as WorldState;

      const result = selectYokozunaCandidates(world);
      expect(result).toEqual([]);
    });

    it("should return an empty array if there are no ozeki", () => {
      const world = {
        rikishi: new Map<string, Rikishi>([
          ["1", mockRikishi("1", { rank: "yokozuna" })],
          ["2", mockRikishi("2", { rank: "sekiwake" })],
          ["3", mockRikishi("3", { rank: "komusubi" })],
          ["4", mockRikishi("4", { rank: "maegashira" })],
        ]),
      } as unknown as WorldState;

      const result = selectYokozunaCandidates(world);
      expect(result).toEqual([]);
    });

    it("should return active ozeki and exclude retired ones or other ranks", () => {
      const activeOzeki1 = mockRikishi("1", { rank: "ozeki", isRetired: false });
      const activeOzeki2 = mockRikishi("2", { rank: "ozeki", isRetired: false });
      const retiredOzeki = mockRikishi("3", { rank: "ozeki", isRetired: true });
      const activeYokozuna = mockRikishi("4", { rank: "yokozuna", isRetired: false });

      const world = {
        rikishi: new Map<string, Rikishi>([
          ["1", activeOzeki1],
          ["2", activeOzeki2],
          ["3", retiredOzeki],
          ["4", activeYokozuna],
        ]),
      } as unknown as WorldState;

      const result = selectYokozunaCandidates(world);

      expect(result).toHaveLength(2);
      expect(result).toContain(activeOzeki1);
      expect(result).toContain(activeOzeki2);
      expect(result).not.toContain(retiredOzeki);
      expect(result).not.toContain(activeYokozuna);
    });

    it("should memoize the result when called with the same world reference", () => {
      const world = {
        rikishi: new Map<string, Rikishi>([
          ["1", mockRikishi("1", { rank: "ozeki" })],
        ]),
      } as unknown as WorldState;

      const result1 = selectYokozunaCandidates(world);
      const result2 = selectYokozunaCandidates(world);

      expect(result1).toBe(result2); // Reference equality
    });

    it("should recompute if world reference changes", () => {
      const world1 = {
        rikishi: new Map<string, Rikishi>([
          ["1", mockRikishi("1", { rank: "ozeki" })],
        ]),
      } as unknown as WorldState;

      const result1 = selectYokozunaCandidates(world1);

      const world2 = {
        rikishi: new Map<string, Rikishi>([
          ["1", mockRikishi("1", { rank: "ozeki" })],
        ]),
      } as unknown as WorldState;

      const result2 = selectYokozunaCandidates(world2);

      // Value should be the same but reference should be different
      expect(result1).not.toBe(result2);
    });
  });
});
