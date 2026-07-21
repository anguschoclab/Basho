import { describe, it, expect } from "vitest";
import {
  getCitizenshipStatus,
  countsAsForeign,
  yearsUntilNaturalization,
  getHeyaForeignUsage,
  isAtForeignLimit,
} from "@/engine/utils/citizenshipUtils";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

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

  describe("countsAsForeign", () => {
    it("returns true for foreign", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2020" });
      expect(countsAsForeign(r, 2024)).toBe(true);
    });

    it("returns false for native", () => {
      const r = MockFactory.createRikishi({ nationality: "Japan" });
      expect(countsAsForeign(r, 2024)).toBe(false);
    });

    it("returns false for naturalized", () => {
      const r = MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2019" });
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
    it("counts only foreign rikishi", () => {
      const rikishiList = [
        MockFactory.createRikishi({ nationality: "Japan" }), // native
        MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2020" }), // foreign
        MockFactory.createRikishi({ nationality: "Mongolia", joinedHeyaDate: "2018" }), // naturalized
        MockFactory.createRikishi({ nationality: "USA", joinedHeyaDate: "2024" }), // foreign
      ];
      expect(getHeyaForeignUsage(rikishiList, 2024)).toBe(2);
    });
  });

  describe("isAtForeignLimit", () => {
    it("returns true when at limit (2)", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "f1", nationality: "Mongolia", joinedHeyaDate: "2020" }),
        MockFactory.createRikishi({ id: "f2", nationality: "USA", joinedHeyaDate: "2024" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(true);
    });

    it("returns true when over limit (>2)", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "f1", nationality: "Mongolia", joinedHeyaDate: "2020" }),
        MockFactory.createRikishi({ id: "f2", nationality: "USA", joinedHeyaDate: "2024" }),
        MockFactory.createRikishi({ id: "f3", nationality: "Brazil", joinedHeyaDate: "2023" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(true);
    });

    it("returns false when under limit (<2)", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "f1", nationality: "Mongolia", joinedHeyaDate: "2020" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(false);
    });

    it("returns false when only native and naturalized are present", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "n1", nationality: "Japan" }),
        MockFactory.createRikishi({ id: "nat1", nationality: "Mongolia", joinedHeyaDate: "2018" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(false);
    });

    it("returns false with 2 naturalized + 1 foreign (only foreign counts)", () => {
      const rikishiList = [
        MockFactory.createRikishi({ id: "nat1", nationality: "Mongolia", joinedHeyaDate: "2018" }),
        MockFactory.createRikishi({ id: "nat2", nationality: "USA", joinedHeyaDate: "2017" }),
        MockFactory.createRikishi({ id: "f1", nationality: "Brazil", joinedHeyaDate: "2024" }),
      ];
      expect(isAtForeignLimit(rikishiList, 2024)).toBe(false);
    });
  });
});
