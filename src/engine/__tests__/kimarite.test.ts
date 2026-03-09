import { describe, it, expect } from "vitest";
import {
  KIMARITE_ALL,
  getKimarite,
  getKimariteByCategory,
  getKimariteByClass,
  getKimariteForStance,
  getKimariteCount,
} from "../kimarite";

describe("Kimarite Registry", () => {
  it("should contain all official 82 kimarite plus non-techniques", () => {
    // 82 official + 5 result + 2 forfeit
    expect(KIMARITE_ALL.length).toBe(89);
    expect(getKimariteCount()).toBe(82);
  });

  it("should fetch specific kimarite correctly", () => {
    const yorikiri = getKimarite("yorikiri");
    expect(yorikiri).toBeDefined();
    expect(yorikiri?.nameJa).toBe("寄り切り");
    expect(yorikiri?.category).toBe("push");
    expect(yorikiri?.gripNeed).toBe("belt");

    const hatakikomi = getKimarite("hatakikomi");
    expect(hatakikomi).toBeDefined();
    expect(hatakikomi?.category).toBe("pull");
    expect(hatakikomi?.kimariteClass).toBe("slap_pull");
  });

  it("should filter by category", () => {
    const thrusts = getKimariteByCategory("thrust");
    expect(thrusts.length).toBeGreaterThan(0);
    expect(thrusts.every(k => k.category === "thrust")).toBe(true);
    
    const results = getKimariteByCategory("result");
    expect(results.length).toBe(5); // isamiashi, koshikudake, etc.
  });

  it("should filter by class", () => {
    const forceOuts = getKimariteByClass("force_out");
    expect(forceOuts.some(k => k.id === "yorikiri")).toBe(true);
    expect(forceOuts.some(k => k.id === "oshidashi")).toBe(true);
  });

  it("should filter by required stance", () => {
    const beltMoves = getKimariteForStance("belt-dominant");
    expect(beltMoves.some(k => k.id === "uwatenage")).toBe(true);
    expect(beltMoves.some(k => k.id === "hatakikomi")).toBe(false); // hatakikomi is no-grip / slap_pull
  });

  it("should not contain any placeholder guards", () => {
    expect(getKimarite("sototasukizori_dummy")).toBeUndefined();
    expect(KIMARITE_ALL.some(k => k.name === "REMOVE_ME")).toBe(false);
  });
});
