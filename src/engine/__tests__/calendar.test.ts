import { describe, it, expect } from "vitest";
import {
  BASHO_CALENDAR,
  BASHO_ORDER,
  getBashoByNumber,
  getNextBasho,
  getBashoIndex,
  getInterimWeeks,
  getBashoInfo,
  getSeasonalFlavor,
  getDayName,
  isKeyDay,
} from "../calendar";

describe("Calendar System", () => {
  it("should have correct basho order and definitions", () => {
    expect(BASHO_ORDER).toEqual(["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"]);
    expect(Object.keys(BASHO_CALENDAR).length).toBe(6);
  });

  it("should return correct basho by number", () => {
    expect(getBashoByNumber(1).name).toBe("hatsu");
    expect(getBashoByNumber(3).name).toBe("natsu");
    expect(getBashoByNumber(6).name).toBe("kyushu");
  });

  it("should return next basho", () => {
    expect(getNextBasho("hatsu")).toBe("haru");
    expect(getNextBasho("kyushu")).toBe("hatsu");
  });

  it("should return correct basho index", () => {
    expect(getBashoIndex("hatsu")).toBe(0);
    expect(getBashoIndex("kyushu")).toBe(5);
  });

  it("should return fixed interim weeks", () => {
    expect(getInterimWeeks("hatsu", "haru")).toBe(6);
  });

  it("should accurately compute determinisitic start day (2nd Sunday)", () => {
    // 2026-01-01 is a Thursday
    // First Sunday: 2026-01-04
    // Second Sunday: 2026-01-11
    const hatsu2026 = getBashoInfo("hatsu", 2026);
    expect(hatsu2026.startDay).toBe(11);

    // 2026-03-01 is a Sunday
    // First Sunday: 2026-03-01
    // Second Sunday: 2026-03-08
    const haru2026 = getBashoInfo("haru", 2026);
    expect(haru2026.startDay).toBe(8);
  });

  it("should select seasonal flavor deterministically", () => {
    const flavor1 = getSeasonalFlavor("winter", "seed-a");
    const flavor2 = getSeasonalFlavor("winter", "seed-a");
    const flavor3 = getSeasonalFlavor("winter", "seed-b");

    expect(flavor1).toBe(flavor2);
    // flavor3 might be different, but must be defined
    expect(typeof flavor1).toBe("string");
    expect(typeof flavor3).toBe("string");
  });

  it("should handle empty or undefined seeds safely in seasonal flavor", () => {
    const flavor = getSeasonalFlavor("spring", undefined);
    expect(flavor).toBeTruthy();
  });

  it("should format day names correctly", () => {
    expect(getDayName(1).dayJa).toBe("初日");
    expect(getDayName(7).dayJa).toBe("中日");
    expect(getDayName(8).dayJa).toBe("中日");
    expect(getDayName(15).dayJa).toBe("千秋楽");
    expect(getDayName(5).dayJa).toBe("5日目");
  });

  it("should correctly identify key days", () => {
    expect(isKeyDay(1)).toBe(true);
    expect(isKeyDay(8)).toBe(true);
    expect(isKeyDay(14)).toBe(true);
    expect(isKeyDay(15)).toBe(true);
    
    expect(isKeyDay(2)).toBe(false);
    expect(isKeyDay(9)).toBe(false);
  });
});
