import { describe, it, expect } from "vitest";
import {
  KIMARITE_REGISTRY,
  getKimarite,
  getKimariteByClass,
  getKimariteCount,
  getKimariteByJsaCategory,
} from "../kimarite";

describe("Kimarite Registry (v1.3)", () => {
  it("should contain all official 82 kimarite plus non-techniques", () => {
    // 82 official + 7 non-standard (fusensho, hansoku, 5 results)
    expect(KIMARITE_REGISTRY.length).toBe(89);
    expect(getKimariteCount()).toBe(82);
  });

  it("should fetch specific kimarite correctly", () => {
    const yorikiri = getKimarite("yorikiri");
    expect(yorikiri).toBeDefined();
    expect(yorikiri?.nameJa).toBe("寄り切り");
    expect(yorikiri?.jsaCategory).toBe("Kihonwaza");
    expect(yorikiri?.tacticalFamily).toBe("belt");

    const hatakikomi = getKimarite("hatakikomi");
    expect(hatakikomi).toBeDefined();
    expect(hatakikomi?.jsaCategory).toBe("Tokushuwaza");
    expect(hatakikomi?.kimariteClass).toBe("slap_pull");
  });

  it("should filter by JSA category", () => {
    const kihonwaza = getKimariteByJsaCategory("Kihonwaza");
    expect(kihonwaza.length).toBe(7);
    expect(kihonwaza.every(k => k.jsaCategory === "Kihonwaza")).toBe(true);
    
    const hiwaza = getKimariteByJsaCategory("Hiwaza");
    expect(hiwaza.length).toBe(5); // isamiashi, koshikudake, etc.
  });

  it("should filter by legacy class", () => {
    const forceOuts = getKimariteByClass("force_out");
    expect(forceOuts.some(k => k.id === "yorikiri")).toBe(true);
    expect(forceOuts.some(k => k.id === "oshidashi")).toBe(true);
  });

  it("should have correct stat weights for categories", () => {
    const yorikiri = getKimarite("yorikiri");
    // Kihonwaza defaults: strength: 0.4, weight: 0.4, speed: 0.1, technique: 0.1, balance: 0.0
    expect(yorikiri?.statWeights.strength).toBe(0.4);
    expect(yorikiri?.statWeights.weight).toBe(0.4);

    const ketaguri = getKimarite("ketaguri");
    // Kakeite defaults: strength: 0.1, weight: 0.0, speed: 0.5, technique: 0.4, balance: 0.0
    expect(ketaguri?.statWeights.weight).toBe(0.0);
    expect(ketaguri?.statWeights.speed).toBe(0.5);
  });

  it("should not contain any placeholder guards", () => {
    expect(getKimarite("sototasukizori_dummy")).toBeUndefined();
    expect(KIMARITE_REGISTRY.some(k => k.name === "REMOVE_ME")).toBe(false);
  });
});
