/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { KIMARITE_REGISTRY, KIMARITE_STRATEGIES } from "@/engine/kimarite";

describe("Kimarite descriptions and nameJa", () => {
  it("every KIMARITE_REGISTRY entry has a description that is NOT the placeholder", () => {
    for (const k of KIMARITE_REGISTRY) {
      const placeholder = `${k.name} technique.`;
      expect(k.description, `Kimarite "${k.id}" has placeholder description`).not.toBe(placeholder);
      expect(k.description, `Kimarite "${k.id}" has no description`).toBeTruthy();
    }
  });

  it("every entry has nameJa that is NOT the raw id string", () => {
    for (const k of KIMARITE_REGISTRY) {
      expect(k.nameJa, `Kimarite "${k.id}" nameJa equals id`).not.toBe(k.id);
      expect(k.nameJa, `Kimarite "${k.id}" has no nameJa`).toBeTruthy();
    }
  });

  it("nameJa matches japaneseName from KIMARITE_STRATEGIES where IDs align", () => {
    const strategyMap = new Map<string, string>();
    for (const s of KIMARITE_STRATEGIES) {
      strategyMap.set(s.id, s.japaneseName);
    }

    for (const k of KIMARITE_REGISTRY) {
      const strategyJa = strategyMap.get(k.id);
      if (strategyJa) {
        expect(k.nameJa, `Kimarite "${k.id}" nameJa mismatch with KIMARITE_STRATEGIES`).toBe(strategyJa);
      }
    }
  });
});
