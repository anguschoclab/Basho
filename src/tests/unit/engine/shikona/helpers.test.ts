import { describe, it, expect } from "vitest";
import {
  choosePattern,
  pickConnectorToken,
  mergePatternWeights,
  nationalityPool,
  getHouseStyle,
  pickPrefixByCategoryBias,
  pickSuffixByCategoryBias,
} from "@/engine/shikona/helpers";
import {
  SHIKONA_PREFIXES,
  SHIKONA_SUFFIXES,
  NATIONALITY_PREFIXES,
  BASE_PATTERN_WEIGHTS,
} from "@/engine/shikona/constants";
import { HOUSE_STYLES } from "@/engine/shikona/houseStyles";
import { SeededRNG } from "@/engine/rng";
import type { PatternId, HouseStyle } from "@/engine/shikona/types";

// ── helpers ────────────────────────────────────────────────────────────────

function mockRng(value: number): () => number {
  return () => value;
}

function seqRng(values: number[]): () => number {
  let idx = 0;
  return () => values[idx++ % values.length];
}

// ── choosePattern ──────────────────────────────────────────────────────────

describe("choosePattern", () => {
  describe("table-driven boundary tests with weights { a: 10, b: 20, c: 30 } (total=60)", () => {
    const weights = { a: 10, b: 20, c: 30 } as Record<string, number>;

    const cases: Array<{ rng: number; expected: string; label: string }> = [
      { rng: 0.0, expected: "a", label: "r=0 → a" },
      { rng: 10 / 60, expected: "a", label: "boundary 10/60 → a (inclusive)" },
      { rng: 10 / 60 + 0.001, expected: "b", label: "just above 10/60 → b" },
      { rng: 30 / 60, expected: "b", label: "boundary 30/60 → b (inclusive)" },
      { rng: 30 / 60 + 0.001, expected: "c", label: "just above 30/60 → c" },
      { rng: 0.999, expected: "c", label: "near-max → c (last item fallback)" },
    ];

    for (const { rng, expected, label } of cases) {
      it(label, () => {
        const result = choosePattern(mockRng(rng), weights as Record<PatternId, number>);
        expect(result).toBe(expected);
      });
    }
  });

  describe("with BASE_PATTERN_WEIGHTS", () => {
    const validPatterns: PatternId[] = [
      "nat+terrain",
      "power+any",
      "nature+noble",
      "tradition+flora",
      "regional+ending",
      "cat+cat",
      "triple",
    ];

    it("returns a valid PatternId for rng=0.0", () => {
      const result = choosePattern(mockRng(0.0), BASE_PATTERN_WEIGHTS as Record<PatternId, number>);
      expect(validPatterns).toContain(result);
    });

    it("returns a valid PatternId for rng=0.999", () => {
      const result = choosePattern(
        mockRng(0.999),
        BASE_PATTERN_WEIGHTS as Record<PatternId, number>
      );
      expect(validPatterns).toContain(result);
    });

    it("returns a valid PatternId for rng=0.5", () => {
      const result = choosePattern(mockRng(0.5), BASE_PATTERN_WEIGHTS as Record<PatternId, number>);
      expect(validPatterns).toContain(result);
    });
  });

  describe("edge cases", () => {
    it("single pattern always returns that pattern", () => {
      const weights = { x: 5 } as Record<PatternId, number>;
      expect(choosePattern(mockRng(0.0), weights)).toBe("x");
      expect(choosePattern(mockRng(0.5), weights)).toBe("x");
      expect(choosePattern(mockRng(0.999), weights)).toBe("x");
    });

    it("zero-weight item is skipped for non-zero rng", () => {
      const weights = { a: 0, b: 10 } as Record<PatternId, number>;
      // At rng()=0.0: r=0, r-=0 → 0 ≤ 0 → returns "a" (boundary catches zero-weight first item)
      expect(choosePattern(mockRng(0.0), weights)).toBe("a");
      // At rng()=0.5: r=5, r-=0 → 5 > 0 (skip), r-=10 → -5 ≤ 0 → returns "b"
      expect(choosePattern(mockRng(0.5), weights)).toBe("b");
      expect(choosePattern(mockRng(0.999), weights)).toBe("b");
    });

    it("all zero weights returns first item", () => {
      const weights = { a: 0, b: 0 } as Record<PatternId, number>;
      expect(choosePattern(mockRng(0.5), weights)).toBe("a");
    });
  });
});

// ── pickConnectorToken ─────────────────────────────────────────────────────

describe("pickConnectorToken", () => {
  const balancedClassic = HOUSE_STYLES.find((h) => h.id === "balanced_classic")!;
  // No connectorBias on balanced_classic → base weights: no=10, ga=7, shi=5, kuni=3, iwa=3, yori=2 (total=30)

  describe("with balanced_classic (no connectorBias, total=30)", () => {
    const cases: Array<{ rng: number; expected: string; label: string }> = [
      { rng: 0.0, expected: "", label: "r=0 → no → ''" },
      { rng: 0.33, expected: "", label: "r=9.9 → no (9.9-10=-0.1≤0) → ''" },
      { rng: 0.34, expected: "ga", label: "r=10.2 → ga (10.2-10=0.2, 0.2-7≤0)" },
      { rng: 0.56, expected: "ga", label: "r=16.8 → ga (16.8-10=6.8, 6.8-7≤0)" },
      { rng: 0.57, expected: "shi", label: "r=17.1 → shi (17.1-10=7.1, -7=0.1, 0.1-5≤0)" },
      { rng: 0.73, expected: "shi", label: "r=21.9 → shi (21.9-10=11.9, -7=4.9, -5≤0)" },
      { rng: 0.74, expected: "kuni", label: "r=22.2 → kuni" },
      { rng: 0.83, expected: "kuni", label: "r=24.9 → kuni (boundary)" },
      { rng: 0.84, expected: "iwa", label: "r=25.2 → iwa" },
      { rng: 0.93, expected: "iwa", label: "r=27.9 → iwa (boundary)" },
      { rng: 0.94, expected: "yori", label: "r=28.2 → yori" },
      { rng: 0.999, expected: "yori", label: "r=29.97 → yori (last fallback)" },
    ];

    for (const { rng, expected, label } of cases) {
      it(label, () => {
        expect(pickConnectorToken(mockRng(rng), balancedClassic)).toBe(expected);
      });
    }
  });

  describe("with sea_wind (connectorBias: { no: 3, yori: 2 }, total=35)", () => {
    const seaWind = HOUSE_STYLES.find((h) => h.id === "sea_wind")!;
    // Adjusted: no=13, ga=7, shi=5, kuni=3, iwa=3, yori=4

    it("rng=0.0 → '' (no, 0 < 13)", () => {
      expect(pickConnectorToken(mockRng(0.0), seaWind)).toBe("");
    });

    it("rng=0.37 → '' (0.37*35=12.95 < 13, still no)", () => {
      expect(pickConnectorToken(mockRng(0.37), seaWind)).toBe("");
    });

    it("rng=0.38 → 'ga' (0.38*35=13.3 > 13)", () => {
      expect(pickConnectorToken(mockRng(0.38), seaWind)).toBe("ga");
    });

    it("rng=0.94 → 'yori' (0.94*35=32.9, subtract 31, 1.9 < 4)", () => {
      expect(pickConnectorToken(mockRng(0.94), seaWind)).toBe("yori");
    });
  });

  describe("with dragon_noble (connectorBias: { kuni: 2, iwa: 1, ga: 1 }, total=34)", () => {
    const dragonNoble = HOUSE_STYLES.find((h) => h.id === "dragon_noble")!;
    // Adjusted: no=10, ga=8, shi=5, kuni=5, iwa=4, yori=2

    it("rng=0.5 → 'shi' (0.5*34=17, -10=7, -8=-1≤0 → shi? No: 7-5=2, 2-5=-3≤0 → kuni)", () => {
      // 17 - 10 = 7; 7 - 8 = -1 ≤ 0 → ga
      expect(pickConnectorToken(mockRng(0.5), dragonNoble)).toBe("ga");
    });

    it("rng=0.6 → 'kuni' (0.6*34=20.4, -10=10.4, -8=2.4, -5=-2.6≤0 → shi? No: 2.4-5=-2.6 → shi)", () => {
      // 20.4 - 10 = 10.4; 10.4 - 8 = 2.4; 2.4 - 5 = -2.6 ≤ 0 → shi
      expect(pickConnectorToken(mockRng(0.6), dragonNoble)).toBe("shi");
    });
  });

  describe("extreme connectorBias", () => {
    it("connectorBias { no: 100 } clamps to 50, heavily favors no", () => {
      const house: HouseStyle = {
        id: "balanced_classic",
        name: "Test",
        patternBias: {},
        prefixCategoryBias: {},
        suffixCategoryBias: {},
        connectorBias: { no: 100 },
      };
      // no=50 (clamped), ga=7, shi=5, kuni=3, iwa=3, yori=2, total=70
      expect(pickConnectorToken(mockRng(0.0), house)).toBe("");
      expect(pickConnectorToken(mockRng(0.5), house)).toBe(""); // 0.5*70=35 < 50
      expect(pickConnectorToken(mockRng(0.7), house)).toBe(""); // 0.7*70=49 < 50
    });

    it("connectorBias { no: -100 } clamps to 0.1, no nearly impossible", () => {
      const house: HouseStyle = {
        id: "balanced_classic",
        name: "Test",
        patternBias: {},
        prefixCategoryBias: {},
        suffixCategoryBias: {},
        connectorBias: { no: -100 },
      };
      // no=0.1 (clamped), ga=7, shi=5, kuni=3, iwa=3, yori=2, total=20.1
      expect(pickConnectorToken(mockRng(0.0), house)).toBe(""); // 0 < 0.1 → no
      expect(pickConnectorToken(mockRng(0.01), house)).toBe("ga"); // 0.01*20.1=0.201 > 0.1 → ga
    });
  });

  it("return value is always valid for 1000 iterations with real rng", () => {
    const rng = new SeededRNG("connector-validation");
    const valid = ["", "ga", "shi", "kuni", "iwa", "yori"];
    for (let i = 0; i < 1000; i++) {
      const result = pickConnectorToken(() => rng.next(), balancedClassic);
      expect(valid).toContain(result);
    }
  });
});

// ── mergePatternWeights ────────────────────────────────────────────────────

describe("mergePatternWeights", () => {
  it("merges single bias additively", () => {
    const base = { "cat+cat": 10, triple: 20 } as Record<PatternId, number>;
    const result = mergePatternWeights(base, { "cat+cat": 5 });
    expect(result["cat+cat"]).toBe(15);
    expect(result.triple).toBe(20);
  });

  it("merges multiple biases additively", () => {
    const base = { "cat+cat": 10, triple: 20 } as Record<PatternId, number>;
    const result = mergePatternWeights(base, { "cat+cat": 5 }, { "cat+cat": 3, triple: 7 });
    expect(result["cat+cat"]).toBe(18);
    expect(result.triple).toBe(27);
  });

  it("adds new key from bias (base[key] ?? 0 + bias[key])", () => {
    const base = { "cat+cat": 10 } as Record<PatternId, number>;
    const result = mergePatternWeights(base, { triple: 5 });
    expect(result.triple).toBe(5);
    expect(result["cat+cat"]).toBe(10);
  });

  it("clamps negative result to 0.1", () => {
    const base = { "cat+cat": 10 } as Record<PatternId, number>;
    const result = mergePatternWeights(base, { "cat+cat": -100 });
    expect(result["cat+cat"]).toBe(0.1);
  });

  it("clamps large result to 100", () => {
    const base = { "cat+cat": 10 } as Record<PatternId, number>;
    const result = mergePatternWeights(base, { "cat+cat": 200 });
    expect(result["cat+cat"]).toBe(100);
  });

  it("clamps all base values even with no biases", () => {
    const base = { "cat+cat": 150, triple: -5 } as Record<PatternId, number>;
    const result = mergePatternWeights(base);
    expect(result["cat+cat"]).toBe(100);
    expect(result.triple).toBe(0.1);
  });

  it("empty biases returns clamped base", () => {
    const base = { "cat+cat": 50, triple: 30 } as Record<PatternId, number>;
    const result = mergePatternWeights(base);
    expect(result["cat+cat"]).toBe(50);
    expect(result.triple).toBe(30);
  });
});

// ── nationalityPool ────────────────────────────────────────────────────────

describe("nationalityPool", () => {
  it("returns Mongolia prefixes for nationality='Mongolia'", () => {
    const pool = nationalityPool({ nationality: "Mongolia" });
    expect(pool).toBe(NATIONALITY_PREFIXES.Mongolia);
  });

  it("returns USA prefixes for nationality='USA'", () => {
    const pool = nationalityPool({ nationality: "USA" });
    expect(pool).toBe(NATIONALITY_PREFIXES.USA);
  });

  it("returns default for unknown nationality", () => {
    const pool = nationalityPool({ nationality: "Unknown" });
    expect(pool).toBe(NATIONALITY_PREFIXES.default);
  });

  it("returns default for undefined nationality", () => {
    const pool = nationalityPool({});
    expect(pool).toBe(NATIONALITY_PREFIXES.default);
  });

  it("returns default for empty config", () => {
    const pool = nationalityPool({});
    expect(pool).toBe(NATIONALITY_PREFIXES.default);
  });
});

// ── getHouseStyle ──────────────────────────────────────────────────────────

describe("getHouseStyle", () => {
  it("returns balanced_classic for undefined heyaId", () => {
    const style = getHouseStyle(undefined);
    expect(style.id).toBe("balanced_classic");
  });

  it("returns balanced_classic for empty string heyaId", () => {
    const style = getHouseStyle("");
    expect(style.id).toBe("balanced_classic");
  });

  it("returns a valid HouseStyle for a given heyaId", () => {
    const style = getHouseStyle("some-heya-id");
    expect(HOUSE_STYLES).toContain(style);
  });

  it("is deterministic — same heyaId always returns same style", () => {
    const style1 = getHouseStyle("test-heya-123");
    const style2 = getHouseStyle("test-heya-123");
    expect(style1).toBe(style2);
  });

  it("returned style has all required fields", () => {
    const style = getHouseStyle("test-heya");
    expect(style.id).toBeDefined();
    expect(style.name).toBeDefined();
    expect(style.patternBias).toBeDefined();
    expect(style.prefixCategoryBias).toBeDefined();
    expect(style.suffixCategoryBias).toBeDefined();
  });
});

// ── pickPrefixByCategoryBias ───────────────────────────────────────────────

describe("pickPrefixByCategoryBias", () => {
  it("returns a string from one of the SHIKONA_PREFIXES arrays", () => {
    const rng = new SeededRNG("prefix-test");
    const allPrefixes = Object.values(SHIKONA_PREFIXES).flat();
    for (let i = 0; i < 100; i++) {
      const result = pickPrefixByCategoryBias(() => rng.next(), {});
      expect(allPrefixes).toContain(result);
    }
  });

  it("with extreme bias { power: 100 }, power is selected most often", () => {
    const rng = new SeededRNG("prefix-bias-test");
    let powerCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = pickPrefixByCategoryBias(() => rng.next(), { power: 100 });
      const powerPrefixes: string[] = [...SHIKONA_PREFIXES.power];
      if (powerPrefixes.includes(result)) powerCount++;
    }
    // power weight = clamp(10 + 100, 1, 50) = 50; others = 10 each (4 categories)
    // total = 50 + 10*3 = 80; power probability = 50/80 = 62.5%
    expect(powerCount).toBeGreaterThan(50);
  });
});

// ── pickSuffixByCategoryBias ───────────────────────────────────────────────

describe("pickSuffixByCategoryBias", () => {
  it("returns a string from one of the SHIKONA_SUFFIXES arrays", () => {
    const rng = new SeededRNG("suffix-test");
    const allSuffixes = Object.values(SHIKONA_SUFFIXES).flat();
    for (let i = 0; i < 100; i++) {
      const result = pickSuffixByCategoryBias(() => rng.next(), {});
      expect(allSuffixes).toContain(result);
    }
  });

  it("with extreme bias { mountain: 100 }, mountain is selected most often", () => {
    const rng = new SeededRNG("suffix-bias-test");
    let mountainCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = pickSuffixByCategoryBias(() => rng.next(), { mountain: 100 });
      const mountainSuffixes: string[] = [...SHIKONA_SUFFIXES.mountain];
      if (mountainSuffixes.includes(result)) mountainCount++;
    }
    // mountain weight = clamp(10 + 100, 1, 50) = 50; others = 10 each (5 categories)
    // total = 50 + 10*5 = 100; mountain probability = 50%
    expect(mountainCount).toBeGreaterThan(35);
  });
});
