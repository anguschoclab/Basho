import { describe, it, expect } from "vitest";
import {
  getCitizenshipStatus,
  countsAsForeign,
  yearsUntilNaturalization,
  getHeyaForeignUsage,
  isAtForeignLimit,
} from "@/engine/utils/citizenshipUtils";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

describe("citizenshipUtils", () => {
  describe("getCitizenshipStatus", () => {
    it("returns native for Japan nationality", () => {
      const r = MockFactory.createRikishi({ nationality: "Japan" });
      expect(getCitizenshipStatus(r, 2024)).toBe("native");
    });

    it("returns native for Japanese nationality", () => {
      const r = MockFactory.createRikishi({ nationality: "Japanese" });
      expect(getCitizenshipStatus(r, 2024)).toBe("native");
    });

    it("returns naturalized if explicitly set", () => {
      const r = MockFactory.createRikishi({
        nationality: "Mongolia",
        citizenshipStatus: "naturalized",
      });
      expect(getCitizenshipStatus(r, 2024)).toBe("naturalized");
    });

    it("returns naturalized if joined 5 years ago", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2019" });
      expect(getCitizenshipStatus(r, 2024)).toBe("naturalized");
    });

    it("returns naturalized if joined more than 5 years ago", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2018" });
      expect(getCitizenshipStatus(r, 2024)).toBe("naturalized");
    });

    it("returns foreign if joined less than 5 years ago", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2020" });
      expect(getCitizenshipStatus(r, 2024)).toBe("foreign");
    });

    it("returns foreign if not Japanese and no joinedHeyaDate", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia" });
      expect(getCitizenshipStatus(r, 2024)).toBe("foreign");
    });
  });

  // Post-2010 JSA rule: a rikishi's foreign status binds at shindeshi kensa
  // (debut). Naturalizing after debut NEVER frees the slot — only rikishi who
  // held Japanese citizenship at debut (dual citizens, e.g. Hokuseiho) are
  // exempt. The pre-2010 tenure-release loophole is gone.
  describe("countsAsForeign (post-2010 quota binding)", () => {
    it("returns true for foreign", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2020" });
      expect(countsAsForeign(r, 2024)).toBe(true);
    });

    it("returns false for native", () => {
      const r = MockFactory.createRikishi({ nationality: "Japan" });
      expect(countsAsForeign(r, 2024)).toBe(false);
    });

    it("returns TRUE for tenure-naturalized rikishi — post-debut naturalization does not free the slot", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2019" });
      expect(countsAsForeign(r, 2024)).toBe(true);
    });

    it("returns TRUE for explicitly naturalized rikishi (debuted foreign)", () => {
      const r = MockFactory.createRikishi({
        nationality: "Mongolia",
        citizenshipStatus: "naturalized",
      });
      expect(countsAsForeign(r, 2024)).toBe(true);
    });

    it("returns false for dual citizens (Japanese citizenship held at debut)", () => {
      const r = MockFactory.createRikishi({
        nationality: "Mongolia",
        citizenshipStatus: "dual",
      });
      expect(countsAsForeign(r, 2024)).toBe(false);
    });
  });

  describe("yearsUntilNaturalization", () => {
    it("returns 0 for native rikishi", () => {
      const r = MockFactory.createRikishi({ nationality: "Japan" });
      expect(yearsUntilNaturalization(r, 2024)).toBe(0);
    });

    it("returns 0 for already naturalized rikishi", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2019" });
      expect(yearsUntilNaturalization(r, 2024)).toBe(0);
    });

    it("returns correct years remaining for foreign rikishi with joined date", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2020" });
      // 2020 + 5 = 2025. 2025 - 2024 = 1
      expect(yearsUntilNaturalization(r, 2024)).toBe(1);
    });

    it("returns 5 for foreign rikishi without joined date", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia" });
      expect(yearsUntilNaturalization(r, 2024)).toBe(5);
    });
  });

  describe("getHeyaForeignUsage", () => {
    it("counts all foreign-at-debut rikishi, including naturalized", () => {
      const rikishiList = [
        MockFactory.createRikishi({ nationality: "Japan" }), // native
        MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2020" }), // foreign
        MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2018" }), // naturalized — still consumes
        MockFactory.createRikishi({ nationality: "USA", joinedHeyaDate: "2024" }), // foreign
      ];
      expect(getHeyaForeignUsage(rikishiList, 2024)).toBe(3);
    });

    it("does not count dual citizens", () => {
      const rikishiList = [
        MockFactory.createRikishi({ nationality: "Mongolia", citizenshipStatus: "dual" }),
        MockFactory.createRikishi({ nationality: "Japan" }),
      ];
      expect(getHeyaForeignUsage(rikishiList, 2024)).toBe(0);
    });
  });

  describe("isAtForeignLimit", () => {
    it("returns true at the canonical limit (1 foreign)", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "f1", nationality: "Mongolia", joinedHeyaDate: "2020" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(true);
    });

    it("returns true when over the canonical limit", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "f1", nationality: "Mongolia", joinedHeyaDate: "2020" }),
        MockFactory.createRikishi({ id: "f2", nationality: "USA", joinedHeyaDate: "2024" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(true);
    });

    it("returns false when no rikishi counts against the foreign slot", () => {
      const rikishiList = [MockFactory.createRikishi({ id: "n1", nationality: "Japan" })];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(false);
    });

    it("returns false when only native and dual citizens are present", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "n1", nationality: "Japan" }),
        MockFactory.createRikishi({ id: "d1", nationality: "Mongolia", citizenshipStatus: "dual" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(false);
    });

    it("returns true with a single naturalized foreigner — naturalization does not free the slot", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "nat1", nationality: "Mongolia", joinedHeyaDate: "2018" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(true);
    });

    it("returns true with 2 naturalized + 1 foreign (all consume the slot)", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "nat1", nationality: "Mongolia", joinedHeyaDate: "2018" }),
        MockFactory.createRikishi({ id: "nat2", nationality: "USA", joinedHeyaDate: "2017" }),
        MockFactory.createRikishi({ id: "f1", nationality: "Brazil", joinedHeyaDate: "2024" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(true);
    });
  });
});
