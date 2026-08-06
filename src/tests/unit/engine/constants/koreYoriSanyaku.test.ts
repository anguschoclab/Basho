 
import { describe, it, expect } from "vitest";
import {
  KORE_YORI_SANYAKU_ANNOUNCEMENT,
  KORE_YORI_SANYAKU_SHORT,
  SANYAKU_BOUT_COUNT,
  isSanyakuBout,
  getKoreYoriSanyakuText,
} from "@/constants/engine/koreYoriSanyaku";

describe("Kore-yori-sanyaku constants", () => {
  it("announcement text includes Japanese and English", () => {
    expect(KORE_YORI_SANYAKU_ANNOUNCEMENT).toContain("これより三役");
    expect(KORE_YORI_SANYAKU_ANNOUNCEMENT).toContain("three ranks");
  });

  it("short form is a concise label", () => {
    expect(KORE_YORI_SANYAKU_SHORT).toBe("Kore-yori-sanyaku");
  });

  it("sanyaku bout count is 3", () => {
    expect(SANYAKU_BOUT_COUNT).toBe(3);
  });
});

describe("isSanyakuBout", () => {
  it("returns true for the last 3 bouts of a 15-bout day", () => {
    expect(isSanyakuBout(12, 15)).toBe(true);
    expect(isSanyakuBout(13, 15)).toBe(true);
    expect(isSanyakuBout(14, 15)).toBe(true);
  });

  it("returns false for bouts before the final 3", () => {
    expect(isSanyakuBout(0, 15)).toBe(false);
    expect(isSanyakuBout(11, 15)).toBe(false);
  });

  it("returns true for all bouts when total is 3 or fewer", () => {
    expect(isSanyakuBout(0, 3)).toBe(true);
    expect(isSanyakuBout(1, 2)).toBe(true);
  });
});

describe("getKoreYoriSanyakuText", () => {
  it("returns the full announcement text", () => {
    expect(getKoreYoriSanyakuText()).toBe(KORE_YORI_SANYAKU_ANNOUNCEMENT);
  });
});
