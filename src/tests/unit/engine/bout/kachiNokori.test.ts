import { describe, it, expect } from "vitest";
import { calculateKachiNokori } from "@/engine/systems/economy/KachiNokoriService";

describe("Kachi-nokori — calculateKachiNokori", () => {
  it("returns 0 when wins < 8 (no kachi-koshi yet)", () => {
    expect(calculateKachiNokori(7)).toBe(0);
    expect(calculateKachiNokori(0)).toBe(0);
    expect(calculateKachiNokori(5)).toBe(0);
  });

  it("returns 0 at exactly 8 wins (kachi-koshi, no surplus)", () => {
    expect(calculateKachiNokori(8)).toBe(0);
  });

  it("returns surplus wins above 8", () => {
    expect(calculateKachiNokori(10)).toBe(2);
    expect(calculateKachiNokori(13)).toBe(5);
    expect(calculateKachiNokori(15)).toBe(7);
  });

  it("accounts for absences in total bouts", () => {
    expect(calculateKachiNokori(8)).toBe(0);
    expect(calculateKachiNokori(9)).toBe(1);
  });
});
