import { describe, it, expect } from "vitest";
import {
  extractLegacyPrefix,
  extractLegacySuffix,
  generateLegacyShikona,
} from "@/engine/shikona/legacy";
import { HOUSE_STYLES } from "@/engine/shikona/houseStyles";

// ── extractLegacyPrefix ────────────────────────────────────────────────────

describe("extractLegacyPrefix", () => {
  describe("known prefix matches", () => {
    const cases: Array<{ input: string; expected: string; label: string }> = [
      { input: "Takayama", expected: "Taka", label: "Taka (index 0)" },
      { input: "Wakafuji", expected: "Waka", label: "Waka (index 1)" },
      { input: "Kotoshogiku", expected: "Koto", label: "Koto (index 2)" },
      { input: "Tochinishiki", expected: "Tochi", label: "Tochi (index 3)" },
      { input: "Chiyonofuji", expected: "Chiyo", label: "Chiyo (index 4)" },
      { input: "Hokutofuji", expected: "Hoku", label: "Hoku (index 5)" },
      { input: "Asashoryu", expected: "Asa", label: "Asa (index 7)" },
      { input: "Terunofuji", expected: "Teru", label: "Teru (index 42)" },
      { input: "Ichinojo", expected: "Ichi", label: "Ichi (index 43)" },
      { input: "Aoiyama", expected: "Ao", label: "Ao (index 44)" },
      { input: "Nishiyama", expected: "Nishi", label: "Nishi (index 22)" },
      {
        input: "Higashiyama",
        expected: "Higa",
        label: "Higa (index 23, NOT Higashi — not in list)",
      },
    ];

    for (const { input, expected, label } of cases) {
      it(`${input} → ${expected} (${label})`, () => {
        expect(extractLegacyPrefix(input)).toBe(expected);
      });
    }
  });

  describe("prefix priority", () => {
    it("Kotoyama → Koto (index 2, NOT Ko index 11)", () => {
      expect(extractLegacyPrefix("Kotoyama")).toBe("Koto");
    });

    it("Kokonoe → Ko (index 11, Koto doesn't match Kokonoe)", () => {
      expect(extractLegacyPrefix("Kokonoe")).toBe("Ko");
    });

    it("Ooyama → Oo (index 10)", () => {
      expect(extractLegacyPrefix("Ooyama")).toBe("Oo");
    });

    it("Daiyama → Dai (index 8, not a fallback)", () => {
      expect(extractLegacyPrefix("Daiyama")).toBe("Dai");
    });
  });

  describe("fallback behavior", () => {
    it("Zxyabc → Zxy (no known prefix, len ≥ 3, first 3 chars)", () => {
      expect(extractLegacyPrefix("Zxyabc")).toBe("Zxy");
    });

    it("Zx → Zx (no known prefix, len < 3, first 2 chars)", () => {
      expect(extractLegacyPrefix("Zx")).toBe("Zx");
    });

    it("Ab → Ab (len=2, first 2 chars)", () => {
      expect(extractLegacyPrefix("Ab")).toBe("Ab");
    });

    it("A → A (len=1, substring(0,2) returns A)", () => {
      expect(extractLegacyPrefix("A")).toBe("A");
    });

    it("empty string → empty string", () => {
      expect(extractLegacyPrefix("")).toBe("");
    });
  });

  describe("case sensitivity", () => {
    it("takayama → tak (lowercase taka doesn't match)", () => {
      expect(extractLegacyPrefix("takayama")).toBe("tak");
    });
  });
});

// ── extractLegacySuffix ────────────────────────────────────────────────────

describe("extractLegacySuffix", () => {
  describe("known suffix matches", () => {
    const cases: Array<{ input: string; expected: string; label: string }> = [
      { input: "Takayama", expected: "yama", label: "yama (index 0)" },
      { input: "Tochizan", expected: "zan", label: "zan (index 1)" },
      { input: "Mitake", expected: "take", label: "take (index 2)" },
      { input: "Aoiyama", expected: "yama", label: "yama (index 0)" },
      { input: "Tochishima", expected: "shima", label: "shima (index 5)" },
      { input: "Wakafuji", expected: "fuji", label: "fuji (index 18)" },
      { input: "Asashoryu", expected: "ryu", label: "ryu (index 10)" },
      { input: "Takanomaru", expected: "maru", label: "maru (index 26)" },
      { input: "Takanowaka", expected: "waka", label: "waka (index 28, last)" },
      { input: "Kotonishiki", expected: "nishiki", label: "nishiki (index 21)" },
      { input: "Takanoumi", expected: "umi", label: "umi (index 7)" },
      { input: "Takanohana", expected: "hana", label: "hana (index 20)" },
    ];

    for (const { input, expected, label } of cases) {
      it(`${input} → ${expected} (${label})`, () => {
        expect(extractLegacySuffix(input)).toBe(expected);
      });
    }
  });

  describe("suffix priority", () => {
    it("Takanoyama → yama (index 0, first match)", () => {
      expect(extractLegacySuffix("Takanoyama")).toBe("yama");
    });

    it("Tochinishiki → nishiki (index 21, not a 3-char fallback)", () => {
      expect(extractLegacySuffix("Tochinishiki")).toBe("nishiki");
    });

    it("Takanoshiki → iki (no suffix matches — sho ≠ ending, nishiki ≠ noshiki → 3-char fallback)", () => {
      expect(extractLegacySuffix("Takanoshiki")).toBe("iki");
    });
  });

  describe("fallback behavior", () => {
    it("Zxyabc → abc (no known suffix, len ≥ 3, last 3 chars)", () => {
      expect(extractLegacySuffix("Zxyabc")).toBe("abc");
    });

    it("Zx → Zx (no known suffix, len < 3, last 2 chars)", () => {
      expect(extractLegacySuffix("Zx")).toBe("Zx");
    });

    it("Ab → Ab (len=2, last 2 chars)", () => {
      expect(extractLegacySuffix("Ab")).toBe("Ab");
    });

    it("A → A (len=1, substring from 0 returns A)", () => {
      expect(extractLegacySuffix("A")).toBe("A");
    });

    it("empty string → empty string", () => {
      expect(extractLegacySuffix("")).toBe("");
    });
  });

  describe("case sensitivity", () => {
    it("TAKAYAMA → AMA (lowercase yama doesn't match)", () => {
      expect(extractLegacySuffix("TAKAYAMA")).toBe("AMA");
    });
  });
});

// ── generateLegacyShikona ──────────────────────────────────────────────────

describe("generateLegacyShikona", () => {
  const house = HOUSE_STYLES[0]; // power_mountain

  function seqRng(values: number[]): () => number {
    let idx = 0;
    return () => values[idx++ % values.length];
  }

  describe("branch selection by rng roll", () => {
    it("roll < 0.4: legacy prefix + new suffix (result starts with extracted prefix)", () => {
      const rng = seqRng([0.2, 0.5, 0.5, 0.5, 0.5]);
      const result = generateLegacyShikona("Takayama", rng, house);
      const prefix = extractLegacyPrefix("Takayama");
      expect(result.startsWith(prefix)).toBe(true);
    });

    it("0.4 ≤ roll < 0.7: new prefix + legacy suffix (result ends with extracted suffix)", () => {
      const rng = seqRng([0.5, 0.5, 0.5, 0.5]);
      const result = generateLegacyShikona("Takayama", rng, house);
      const suffix = extractLegacySuffix("Takayama");
      expect(result.endsWith(suffix)).toBe(true);
    });

    it("0.7 ≤ roll < 0.9: full legacy (returns input unchanged)", () => {
      const rng = seqRng([0.8]);
      const result = generateLegacyShikona("Takayama", rng, house);
      expect(result).toBe("Takayama");
    });

    it("roll ≥ 0.9, sub-roll < 0.5: new prefix + legacy suffix", () => {
      const rng = seqRng([0.95, 0.3, 0.5, 0.5, 0.5]);
      const result = generateLegacyShikona("Takayama", rng, house);
      const suffix = extractLegacySuffix("Takayama");
      expect(result.endsWith(suffix)).toBe(true);
    });

    it("roll ≥ 0.9, sub-roll ≥ 0.5: legacy prefix + new suffix", () => {
      const rng = seqRng([0.95, 0.7, 0.5, 0.5, 0.5]);
      const result = generateLegacyShikona("Takayama", rng, house);
      const prefix = extractLegacyPrefix("Takayama");
      expect(result.startsWith(prefix)).toBe(true);
    });
  });

  describe("boundary tests", () => {
    it("roll=0.4 → branch 2 (0.4 is NOT < 0.4)", () => {
      const rng = seqRng([0.4, 0.5, 0.5, 0.5]);
      const result = generateLegacyShikona("Takayama", rng, house);
      const suffix = extractLegacySuffix("Takayama");
      expect(result.endsWith(suffix)).toBe(true);
    });

    it("roll=0.7 → branch 3 (0.7 is NOT < 0.7)", () => {
      const rng = seqRng([0.7]);
      const result = generateLegacyShikona("Takayama", rng, house);
      expect(result).toBe("Takayama");
    });

    it("roll=0.9 → branch 4 (0.9 is NOT < 0.9)", () => {
      const rng = seqRng([0.9, 0.3, 0.5, 0.5, 0.5]);
      const result = generateLegacyShikona("Takayama", rng, house);
      // Branch 4 always produces a composed name, not the original
      expect(result).not.toBe("Takayama");
    });
  });
});
