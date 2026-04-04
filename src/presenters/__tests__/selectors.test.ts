import { describe, it, expect } from "vitest";
import { selectInjuredRikishi } from "../selectors";
import type { WorldState } from "../../engine/types/world";
import { mockRikishi } from "../../engine/__tests__/utils";
import type { Rikishi } from "../../engine/types/rikishi";

describe("selectors", () => {
  describe("selectInjuredRikishi", () => {
    it("should return an empty array if there are no rikishi", () => {
      const world = {
        rikishi: new Map<string, Rikishi>(),
      } as unknown as WorldState;

      const result = selectInjuredRikishi(world);
      expect(result).toEqual([]);
    });

    it("should return an empty array if there are no injured rikishi", () => {
      const healthy1 = mockRikishi("1");
      healthy1.injured = false;
      const healthy2 = mockRikishi("2");
      healthy2.injured = false;

      const world = {
        rikishi: new Map<string, Rikishi>([
          ["1", healthy1],
          ["2", healthy2],
        ]),
      } as unknown as WorldState;

      const result = selectInjuredRikishi(world);
      expect(result).toEqual([]);
    });

    it("should return rikishi with the injured flag set to true", () => {
      const healthy = mockRikishi("1");
      healthy.injured = false;

      const injured = mockRikishi("2");
      injured.injured = true;

      const world = {
        rikishi: new Map<string, Rikishi>([
          ["1", healthy],
          ["2", injured],
        ]),
      } as unknown as WorldState;

      const result = selectInjuredRikishi(world);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should return rikishi with injury.isInjured set to true", () => {
      const healthy = mockRikishi("1");
      healthy.injured = false;

      const injured = mockRikishi("2");
      injured.injured = false;
      injured.injuryStatus = { isInjured: true } as any;

      const world = {
        rikishi: new Map<string, Rikishi>([
          ["1", healthy],
          ["2", injured],
        ]),
      } as unknown as WorldState;

      const result = selectInjuredRikishi(world);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should memoize the result if the world state reference is unchanged", () => {
      const injured = mockRikishi("1");
      injured.injured = true;

      const world = {
        rikishi: new Map<string, Rikishi>([
          ["1", injured],
        ]),
      } as unknown as WorldState;

      const result1 = selectInjuredRikishi(world);
      const result2 = selectInjuredRikishi(world);

      expect(result1).toBe(result2); // Reference equality
    });

    it("should recompute if the world state reference changes", () => {
      const injured = mockRikishi("1");
      injured.injured = true;

      const world1 = {
        rikishi: new Map<string, Rikishi>([
          ["1", injured],
        ]),
      } as unknown as WorldState;

      const world2 = {
        ...world1
      } as unknown as WorldState;

      const result1 = selectInjuredRikishi(world1);
      const result2 = selectInjuredRikishi(world2);

      expect(result1).not.toBe(result2); // Not equal reference
      expect(result1).toEqual(result2); // But deeply equal value
    });
  });
});
