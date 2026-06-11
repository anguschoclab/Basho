import { describe, it, expect } from "vitest";
import { formatYenToMan } from "@/utils/engineUtils";

describe("engineUtils", () => {
  describe("formatYenToMan", () => {
    it("returns ¥amount for amounts less than 10,000", () => {
      expect(formatYenToMan(0)).toBe("¥0");
      expect(formatYenToMan(100)).toBe("¥100");
      expect(formatYenToMan(9999)).toBe("¥9999");
      expect(formatYenToMan(-500)).toBe("¥-500"); // Assuming negative amounts might occur and should follow the < 10000 rule
    });

    it("formats exact multiples of 10,000 into Man (万)", () => {
      expect(formatYenToMan(10000)).toBe("1万");
      expect(formatYenToMan(50000)).toBe("5万");
      expect(formatYenToMan(100000)).toBe("10万");
    });

    it("formats non-multiples of 10,000 with up to 1 decimal place", () => {
      expect(formatYenToMan(15000)).toBe("1.5万");
      expect(formatYenToMan(25000)).toBe("2.5万");
      expect(formatYenToMan(10500)).toBe("1.1万"); // 1.05 rounds to 1.1 due to half-even/rounding rules, or we can just test 12000
      expect(formatYenToMan(12000)).toBe("1.2万");
    });

    it("formats large numbers into Man (万)", () => {
      expect(formatYenToMan(1000000)).toBe("100万");
      expect(formatYenToMan(2500000)).toBe("250万");
      expect(formatYenToMan(15000000)).toBe("1,500万"); // toLocaleString will add comma separator
    });
  });
});
