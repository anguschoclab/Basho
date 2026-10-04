import { describe, it, expect } from "vitest";
import {
  KIMARITE_FREQUENCY_TARGETS,
  KIMARITE_CATEGORY_TARGETS,
  rarityFromShare,
  getKimariteTargetShare,
} from "@/constants/engine/kimariteFrequencies";
import { KIMARITE_REGISTRY } from "@/engine/kimariteRegistry";
import { KIMARITE_STRATEGIES } from "@/engine/kimariteStrategies";

/**
 * Real-world kimarite frequency targets (makuuchi, sourced from SumoFans
 * 1958–2026 / sumodb lifetime stats) and the rarity-tier derivation that
 * consumes them.
 */
describe("kimariteFrequencies", () => {
  describe("KIMARITE_FREQUENCY_TARGETS", () => {
    it("covers every technique that can be produced by the engine", () => {
      for (const s of KIMARITE_STRATEGIES) {
        expect(
          KIMARITE_FREQUENCY_TARGETS[s.id],
          `missing frequency target for strategy '${s.id}'`
        ).toBeDefined();
      }
      for (const k of KIMARITE_REGISTRY) {
        expect(
          KIMARITE_FREQUENCY_TARGETS[k.id],
          `missing frequency target for registry entry '${k.id}'`
        ).toBeDefined();
      }
    });

    it("has non-negative shares for every entry", () => {
      for (const [id, share] of Object.entries(KIMARITE_FREQUENCY_TARGETS)) {
        expect(share, `negative share for '${id}'`).toBeGreaterThanOrEqual(0);
      }
    });

    it("sums to approximately 1 across decidable kimarite", () => {
      const total = Object.values(KIMARITE_FREQUENCY_TARGETS).reduce((a, b) => a + b, 0);
      // Allow forfeit overhead (fusensho/hansoku) to push slightly past 1.0,
      // but the table must be a real distribution, not arbitrary weights.
      expect(total).toBeGreaterThan(0.9);
      expect(total).toBeLessThan(1.1);
    });

    it("matches known real-world head-of-distribution values", () => {
      // Makuuchi lifetime shares (SumoFans, 56,603 bouts 1958-2026):
      // yorikiri ~29.6%, oshidashi ~16.8%, hatakikomi ~7.0%, uwatenage ~6.1%
      expect(KIMARITE_FREQUENCY_TARGETS.yorikiri).toBeGreaterThan(0.25);
      expect(KIMARITE_FREQUENCY_TARGETS.yorikiri).toBeLessThan(0.35);
      expect(KIMARITE_FREQUENCY_TARGETS.oshidashi).toBeGreaterThan(0.14);
      expect(KIMARITE_FREQUENCY_TARGETS.oshidashi).toBeLessThan(0.23);
      expect(KIMARITE_FREQUENCY_TARGETS.hatakikomi).toBeGreaterThan(0.05);
      expect(KIMARITE_FREQUENCY_TARGETS.hatakikomi).toBeLessThan(0.1);
    });

    it("keeps sorite combined under 0.5% (real: ~0.02-0.05%)", () => {
      const sorite = ["izori", "kakezori", "shumokuzori", "sototasukizori", "tasukizori", "tsutaezori"];
      const combined = sorite.reduce(
        (a, id) => a + (KIMARITE_FREQUENCY_TARGETS[id] ?? 0),
        0
      );
      expect(combined).toBeGreaterThan(0); // reachable in-game
      expect(combined).toBeLessThan(0.005);
      for (const id of sorite) {
        expect(KIMARITE_FREQUENCY_TARGETS[id]).toBeLessThan(0.002);
      }
    });
  });

  describe("KIMARITE_CATEGORY_TARGETS", () => {
    it("aggregates the per-technique targets by JSA category", () => {
      // Every category that appears in the registry has a rollup entry.
      for (const k of KIMARITE_REGISTRY) {
        expect(
          KIMARITE_CATEGORY_TARGETS[k.jsaCategory],
          `missing category rollup for '${k.jsaCategory}'`
        ).toBeDefined();
      }
    });
  });

  describe("rarityFromShare", () => {
    it("maps head techniques to common", () => {
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.yorikiri)).toBe("common");
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.oshidashi)).toBe("common");
    });

    it("maps mid-frequency techniques to uncommon", () => {
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.tsukidashi)).toBe("uncommon");
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.kotenage)).toBe("uncommon");
    });

    it("maps low-frequency techniques to rare", () => {
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.utchari)).toBe("rare");
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.kubinage)).toBe("rare");
    });

    it("maps near-zero-frequency techniques to legendary", () => {
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.tsutaezori)).toBe("legendary");
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.izori)).toBe("legendary");
      expect(rarityFromShare(KIMARITE_FREQUENCY_TARGETS.koshikudake)).toBe("legendary");
    });

    it("is monotonic: higher share is never rarer", () => {
      const order = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
      const shares = [0.3, 0.1, 0.03, 0.005, 0.001, 0.0002];
      for (let i = 1; i < shares.length; i++) {
        expect(order[rarityFromShare(shares[i])]).toBeGreaterThanOrEqual(
          order[rarityFromShare(shares[i - 1])]
        );
      }
    });
  });

  describe("getKimariteTargetShare", () => {
    it("returns the target share for a known id", () => {
      expect(getKimariteTargetShare("yorikiri")).toBe(
        KIMARITE_FREQUENCY_TARGETS.yorikiri
      );
    });

    it("returns 0 for an unknown id", () => {
      expect(getKimariteTargetShare("not_a_kimarite")).toBe(0);
    });
  });
});
