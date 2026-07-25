import { describe, it, expect } from "vitest";
import {
  KIMARITE_REGISTRY,
  getKimarite,
  getKimariteByJsaCategory,
  getKimariteByClass,
  getKimariteCount,
  getKimariteForFamily,
} from "@/engine/kimariteRegistry";
import { KIMARITE_STRATEGIES } from "@/engine/kimariteStrategies";
import type { KimariteStrategy } from "@/engine/kimariteStrategies";

describe("kimariteRegistry", () => {
  describe("KIMARITE_REGISTRY", () => {
    it("contains all 82 official kimarite plus fusensho and hansoku", () => {
      expect(KIMARITE_REGISTRY.length).toBeGreaterThanOrEqual(84);
    });

    it("every entry has a unique id", () => {
      const ids = KIMARITE_REGISTRY.map((k) => k.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("every entry has a name and nameJa", () => {
      for (const k of KIMARITE_REGISTRY) {
        expect(k.name).toBeDefined();
        expect(k.nameJa).toBeDefined();
      }
    });

    it("every entry has a description that is not the placeholder", () => {
      for (const k of KIMARITE_REGISTRY) {
        expect(k.description).toBeDefined();
        expect(k.description).not.toBe("");
      }
    });

    it("every entry has baseWeight >= 0", () => {
      for (const k of KIMARITE_REGISTRY) {
        expect(k.baseWeight).toBeGreaterThanOrEqual(0);
      }
    });

    it("every entry has a jsaCategory", () => {
      for (const k of KIMARITE_REGISTRY) {
        expect(k.jsaCategory).toBeDefined();
      }
    });
  });

  describe("getKimarite", () => {
    it("returns the kimarite by id", () => {
      const yorikiri = getKimarite("yorikiri");
      expect(yorikiri).toBeDefined();
      expect(yorikiri?.id).toBe("yorikiri");
      expect(yorikiri?.nameJa).toBe("寄り切り");
    });

    it("returns undefined for unknown id", () => {
      expect(getKimarite("nonexistent")).toBeUndefined();
    });

    it("returns fusensho", () => {
      const fusensho = getKimarite("fusensho");
      expect(fusensho).toBeDefined();
      expect(fusensho?.id).toBe("fusensho");
    });
  });

  describe("getKimariteByJsaCategory", () => {
    it("returns all kihonwaza techniques", () => {
      const kihon = getKimariteByJsaCategory("Kihonwaza");
      expect(kihon.length).toBe(7);
      expect(kihon.every((k) => k.jsaCategory === "Kihonwaza")).toBe(true);
    });

    it("returns all nageite techniques", () => {
      const nage = getKimariteByJsaCategory("Nageite");
      expect(nage.length).toBeGreaterThanOrEqual(12);
    });

    it("returns empty array for unknown category", () => {
      // @ts-expect-error testing invalid input
      expect(getKimariteByJsaCategory("Unknown")).toEqual([]);
    });
  });

  describe("getKimariteByClass", () => {
    it("returns techniques by kimariteClass", () => {
      const forceOut = getKimariteByClass("force_out");
      expect(forceOut.length).toBeGreaterThan(0);
      expect(forceOut.every((k) => k.kimariteClass === "force_out")).toBe(true);
    });
  });

  describe("getKimariteCount", () => {
    it("returns count excluding fusensho, hansoku, and hiwaza", () => {
      const count = getKimariteCount();
      expect(count).toBeGreaterThan(70);
      expect(count).toBeLessThanOrEqual(82);
    });
  });

  describe("getKimariteForFamily", () => {
    it("returns techniques for belt family", () => {
      const belt = getKimariteForFamily("belt");
      expect(belt.length).toBeGreaterThan(0);
      expect(belt.every((k) => k.tacticalFamily === "belt")).toBe(true);
    });

    it("returns techniques for push family", () => {
      const push = getKimariteForFamily("push");
      expect(push.length).toBeGreaterThan(0);
    });

    it("returns empty for family with no techniques", () => {
      // @ts-expect-error testing invalid input
      expect(getKimariteForFamily("nonexistent")).toEqual([]);
    });
  });
});

describe("kimariteStrategies", () => {
  describe("KIMARITE_STRATEGIES", () => {
    it("contains strategies for all major techniques", () => {
      expect(KIMARITE_STRATEGIES.length).toBeGreaterThanOrEqual(80);
    });

    it("every strategy has a unique id", () => {
      const ids = KIMARITE_STRATEGIES.map((s) => s.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("every strategy has a condition function", () => {
      for (const s of KIMARITE_STRATEGIES) {
        expect(typeof s.condition).toBe("function");
      }
    });

    it("every strategy has name, japaneseName, category, and weight", () => {
      for (const s of KIMARITE_STRATEGIES) {
        expect(s.name).toBeDefined();
        expect(s.japaneseName).toBeDefined();
        expect(s.category).toBeDefined();
        expect(s.weight).toBeGreaterThanOrEqual(0);
      }
    });

    it("includes yorikiri strategy", () => {
      const yorikiri = KIMARITE_STRATEGIES.find((s) => s.id === "yorikiri");
      expect(yorikiri).toBeDefined();
      expect(yorikiri?.category).toBe("kihon");
      expect(yorikiri?.weight).toBe(90);
    });

    it("includes hi_waza strategies", () => {
      const hiWaza = KIMARITE_STRATEGIES.filter((s) => s.category === "hi_waza");
      expect(hiWaza.length).toBe(5);
    });

    it("satisfies KimariteStrategy interface", () => {
      // Type-level check — if it compiles, the interface is satisfied
      const _typecheck: KimariteStrategy = KIMARITE_STRATEGIES[0];
      expect(_typecheck).toBeDefined();
    });
  });
});

describe("kimarite barrel re-export", () => {
  it("re-exports all registry functions from kimarite.ts", async () => {
    const barrel = await import("@/engine/kimarite");
    expect(barrel.KIMARITE_REGISTRY).toBeDefined();
    expect(barrel.getKimarite).toBeDefined();
    expect(barrel.getKimariteByJsaCategory).toBeDefined();
    expect(barrel.getKimariteByClass).toBeDefined();
    expect(barrel.getKimariteCount).toBeDefined();
    expect(barrel.getKimariteForFamily).toBeDefined();
  });

  it("re-exports KIMARITE_STRATEGIES from kimarite.ts", async () => {
    const barrel = await import("@/engine/kimarite");
    expect(barrel.KIMARITE_STRATEGIES).toBeDefined();
    expect(barrel.KIMARITE_STRATEGIES.length).toBeGreaterThanOrEqual(80);
  });
});
