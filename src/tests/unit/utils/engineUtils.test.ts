import { describe, it, expect, vi, afterEach } from "vitest";
import {
  makeDeterministicSeed,
  safeShortSeed,
  formatYen,
  formatYenToMan,
  safeRankSortKey,
  sortRikishiByRank,
} from "@/utils/engineUtils";

describe("engineUtils", () => {
  describe("makeDeterministicSeed", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("uses default prefix 'world'", () => {
      vi.spyOn(Date, "now").mockReturnValue(1700000000000);
      const expected = `world-${(1700000000000).toString(36)}`;
      expect(makeDeterministicSeed()).toBe(expected);
    });

    it("uses custom prefix", () => {
      vi.spyOn(Date, "now").mockReturnValue(1700000000000);
      const expected = `test-${(1700000000000).toString(36)}`;
      expect(makeDeterministicSeed("test")).toBe(expected);
    });

    it("uses empty prefix", () => {
      vi.spyOn(Date, "now").mockReturnValue(1700000000000);
      const expected = `-${(1700000000000).toString(36)}`;
      expect(makeDeterministicSeed("")).toBe(expected);
    });

    it("preserves special chars in prefix", () => {
      vi.spyOn(Date, "now").mockReturnValue(1700000000000);
      const expected = `my.app_v2-${(1700000000000).toString(36)}`;
      expect(makeDeterministicSeed("my.app_v2")).toBe(expected);
    });

    it("encodes timestamp as base36", () => {
      vi.spyOn(Date, "now").mockReturnValue(1700000000000);
      const seed = makeDeterministicSeed();
      const tsPart = seed.split("-").slice(1).join("-");
      expect(tsPart).toBe(Number(1700000000000).toString(36));
    });
  });

  describe("safeShortSeed", () => {
    it("returns 'unknown' for undefined", () => {
      expect(safeShortSeed(undefined)).toBe("unknown");
    });

    it("returns 'unknown' for null", () => {
      expect(safeShortSeed(null)).toBe("unknown");
    });

    it("returns 'unknown' for empty string", () => {
      expect(safeShortSeed("")).toBe("unknown");
    });

    it("returns short string unchanged", () => {
      expect(safeShortSeed("short")).toBe("short");
    });

    it("returns string at maxLength boundary unchanged", () => {
      const s = "a".repeat(14);
      expect(safeShortSeed(s)).toBe(s);
    });

    it("truncates string exceeding maxLength with ellipsis", () => {
      const s = "a".repeat(15);
      expect(safeShortSeed(s)).toBe("a".repeat(14) + "…");
    });

    it("respects custom maxLength", () => {
      expect(safeShortSeed("abcdef", 5)).toBe("abcde…");
    });

    it("does not truncate string at custom maxLength boundary", () => {
      expect(safeShortSeed("abcde", 5)).toBe("abcde");
    });

    it("truncated prefix length equals maxLength", () => {
      const result = safeShortSeed("a".repeat(20), 5);
      expect(result.length).toBe(6); // 5 chars + ellipsis
      expect(result.startsWith("a".repeat(5))).toBe(true);
    });
  });

  describe("formatYen", () => {
    it("formats zero", () => {
      expect(formatYen(0)).toBe("¥0");
    });

    it("formats with locale separators", () => {
      expect(formatYen(1234)).toBe("¥1,234");
    });

    it("formats negative numbers", () => {
      expect(formatYen(-1000)).toBe("¥-1,000");
    });

    it("formats large numbers", () => {
      expect(formatYen(1500000)).toBe("¥1,500,000");
    });
  });

  describe("formatYenToMan", () => {
    it("returns ¥amount for amounts less than 10,000", () => {
      expect(formatYenToMan(0)).toBe("¥0");
      expect(formatYenToMan(100)).toBe("¥100");
      expect(formatYenToMan(9999)).toBe("¥9999");
      expect(formatYenToMan(-500)).toBe("¥-500");
    });

    it("formats exact multiples of 10,000 into Man (万)", () => {
      expect(formatYenToMan(10000)).toBe("1万");
      expect(formatYenToMan(50000)).toBe("5万");
      expect(formatYenToMan(100000)).toBe("10万");
    });

    it("formats non-multiples of 10,000 with up to 1 decimal place", () => {
      expect(formatYenToMan(15000)).toBe("1.5万");
      expect(formatYenToMan(25000)).toBe("2.5万");
      expect(formatYenToMan(10500)).toBe("1.1万");
      expect(formatYenToMan(12000)).toBe("1.2万");
    });

    it("formats large numbers into Man (万)", () => {
      expect(formatYenToMan(1000000)).toBe("100万");
      expect(formatYenToMan(2500000)).toBe("250万");
      expect(formatYenToMan(15000000)).toBe("1,500万");
    });

    it("boundary: 9999 stays as ¥, 10000 converts to Man", () => {
      expect(formatYenToMan(9999)).toBe("¥9999");
      expect(formatYenToMan(10000)).toBe("1万");
    });

    it("negative boundary: -9999 stays as ¥, -10000 converts to Man", () => {
      expect(formatYenToMan(-9999)).toBe("¥-9999");
      expect(formatYenToMan(-10000)).toBe("-1万");
      expect(formatYenToMan(-15000)).toBe("-1.5万");
    });

    it("floating point rounds to 1 decimal", () => {
      expect(formatYenToMan(10001)).toBe("1万");
    });

    it("very large number with locale separators", () => {
      expect(formatYenToMan(1_000_000_000)).toBe("100,000万");
    });

    it("zero returns ¥0", () => {
      expect(formatYenToMan(0)).toBe("¥0");
    });
  });

  describe("safeRankSortKey", () => {
    it("returns finite tier for known rank 'yokozuna'", () => {
      const tier = safeRankSortKey("yokozuna");
      expect(typeof tier).toBe("number");
      expect(Number.isFinite(tier)).toBe(true);
    });

    it("returns 999 for unknown rank", () => {
      expect(safeRankSortKey("unknown")).toBe(999);
    });

    it("returns 999 for empty string", () => {
      expect(safeRankSortKey("")).toBe(999);
    });

    it("lower tier = higher rank (yokozuna < maegashira)", () => {
      const ykz = safeRankSortKey("yokozuna");
      const maegashira = safeRankSortKey("maegashira");
      expect(ykz).toBeLessThan(maegashira);
    });
  });

  describe("sortRikishiByRank", () => {
    it("sorts by tier ascending (yokozuna before maegashira)", () => {
      const a = { rank: "yokozuna", shikona: "A" };
      const b = { rank: "maegashira", shikona: "B" };
      expect(sortRikishiByRank(a, b)).toBeLessThan(0);
      expect(sortRikishiByRank(b, a)).toBeGreaterThan(0);
    });

    it("same rank: sorts by rankNumber ascending", () => {
      const a = { rank: "maegashira", rankNumber: 1, shikona: "A" };
      const b = { rank: "maegashira", rankNumber: 5, shikona: "B" };
      expect(sortRikishiByRank(a, b)).toBeLessThan(0);
      expect(sortRikishiByRank(b, a)).toBeGreaterThan(0);
    });

    it("same rank + rankNumber: east before west", () => {
      const east = { rank: "maegashira", rankNumber: 1, side: "east" as const, shikona: "A" };
      const west = { rank: "maegashira", rankNumber: 1, side: "west" as const, shikona: "B" };
      expect(sortRikishiByRank(east, west)).toBeLessThan(0);
      expect(sortRikishiByRank(west, east)).toBeGreaterThan(0);
    });

    it("same rank + rankNumber + side: sorts by shikona via localeCompare", () => {
      const a = { rank: "maegashira", rankNumber: 1, side: "east" as const, shikona: "Alpha" };
      const b = { rank: "maegashira", rankNumber: 1, side: "east" as const, shikona: "Beta" };
      expect(sortRikishiByRank(a, b)).toBeLessThan(0);
      expect(sortRikishiByRank(b, a)).toBeGreaterThan(0);
    });

    it("missing rankNumber treated as 0", () => {
      const a = { rank: "maegashira", shikona: "A" };
      const b = { rank: "maegashira", rankNumber: 5, shikona: "B" };
      expect(sortRikishiByRank(a, b)).toBeLessThan(0);
    });

    it("missing side: non-east sorts after east", () => {
      const east = { rank: "maegashira", rankNumber: 1, side: "east" as const, shikona: "A" };
      const noSide = { rank: "maegashira", rankNumber: 1, shikona: "B" };
      expect(sortRikishiByRank(east, noSide)).toBeLessThan(0);
    });

    it("missing shikona treated as empty string", () => {
      const a = { rank: "maegashira", rankNumber: 1, side: "east" as const };
      const b = { rank: "maegashira", rankNumber: 1, side: "east" as const, shikona: "Beta" };
      // "" < "Beta" so a comes first
      expect(sortRikishiByRank(a, b)).toBeLessThan(0);
    });
  });
});
