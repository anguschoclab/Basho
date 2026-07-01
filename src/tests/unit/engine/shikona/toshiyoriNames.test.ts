import { describe, it, expect } from "vitest";
import { SeededRNG } from "@/engine/rng";
import { generateToshiyoriName } from "@/engine/shikona/toshiyoriNames";

describe("generateToshiyoriName", () => {
  it("returns a non-empty string", () => {
    const rng = new SeededRNG("test-seed-1");
    const name = generateToshiyoriName(rng);
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  });

  it("length is between 4 and 20 characters", () => {
    for (let i = 0; i < 20; i++) {
      const rng = new SeededRNG(`test-seed-${i}`);
      const name = generateToshiyoriName(rng);
      expect(name.length).toBeGreaterThanOrEqual(4);
      expect(name.length).toBeLessThanOrEqual(20);
    }
  });

  it("produces different names for different seeds", () => {
    const names = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const rng = new SeededRNG(`variety-seed-${i}`);
      names.add(generateToshiyoriName(rng));
    }
    expect(names.size).toBeGreaterThan(5);
  });

  it("contains only alphabetic characters", () => {
    for (let i = 0; i < 20; i++) {
      const rng = new SeededRNG(`alpha-seed-${i}`);
      const name = generateToshiyoriName(rng);
      expect(name).toMatch(/^[A-Za-z]+$/);
    }
  });

  it("is deterministic for the same seed", () => {
    const name1 = generateToshiyoriName(new SeededRNG("determinism-seed"));
    const name2 = generateToshiyoriName(new SeededRNG("determinism-seed"));
    expect(name1).toBe(name2);
  });

  it("produces a name from the known pool or composed parts", () => {
    // Run 50 samples — each must either be from the pool or be a compound of known parts
    const TOSHIYORI_POOL = [
      "Saganoumi",
      "Ryogoku",
      "Azumayama",
      "Shiranami",
      "Nishikido",
      "Kasugaumi",
      "Otodake",
      "Tomozuna",
      "Kumagatani",
      "Wakamatsu",
      "Kitazakura",
      "Minatogawa",
      "Onomatsu",
      "Tatsunami",
      "Musashigawa",
      "Narutoumi",
      "Hamanishiki",
      "Michinoku",
      "Nakamura",
      "Asahiyama",
      "Izutsu",
      "Kitanoumi",
      "Kagamiyama",
      "Isenoumi",
      "Hatachiyama",
      "Oitekaze",
      "Sanoyama",
      "Fujishima",
      "Kataonami",
      "Nishimonai",
    ];
    const CLASSICAL = [
      "Kitanofuji",
      "Wakachiyo",
      "Tochinishiki",
      "Harunoyama",
      "Narutaki",
      "Aoiyama",
      "Irodori",
      "Masuiyama",
    ];
    const GEO_PREFIXES = [
      "Nishi",
      "Higashi",
      "Kita",
      "Minami",
      "Aze",
      "Mino",
      "Ise",
      "Tosa",
      "Kaga",
      "Bizen",
    ];
    const NATURE_SUFFIXES = [
      "noumi",
      "yama",
      "nishiki",
      "hama",
      "zaka",
      "gawa",
      "take",
      "shima",
      "ura",
      "zeki",
    ];

    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(`pool-check-${i}`);
      const name = generateToshiyoriName(rng);
      const isFromPool = TOSHIYORI_POOL.includes(name) || CLASSICAL.includes(name);
      const isComposed = GEO_PREFIXES.some(
        (p) => name.startsWith(p) && NATURE_SUFFIXES.some((s) => name.endsWith(s))
      );
      expect(isFromPool || isComposed).toBe(true);
    }
  });
});

// ── Threshold-based selection with mocked RNG ──────────────────────────────

describe("generateToshiyoriName — threshold-based selection with mocked RNG", () => {
  // Duplicate constant arrays (not exported from source module)
  const GEO_PREFIXES = [
    "Nishi",
    "Higashi",
    "Kita",
    "Minami",
    "Aze",
    "Mino",
    "Ise",
    "Tosa",
    "Kaga",
    "Bizen",
  ];
  const NATURE_SUFFIXES = [
    "noumi",
    "yama",
    "nishiki",
    "hama",
    "zaka",
    "gawa",
    "take",
    "shima",
    "ura",
    "zeki",
  ];
  const TOSHIYORI_NAME_POOL = [
    "Saganoumi",
    "Ryogoku",
    "Azumayama",
    "Shiranami",
    "Nishikido",
    "Kasugaumi",
    "Otodake",
    "Tomozuna",
    "Kumagatani",
    "Wakamatsu",
    "Kitazakura",
    "Minatogawa",
    "Onomatsu",
    "Tatsunami",
    "Musashigawa",
    "Narutoumi",
    "Hamanishiki",
    "Michinoku",
    "Nakamura",
    "Asahiyama",
    "Izutsu",
    "Kitanoumi",
    "Kagamiyama",
    "Isenoumi",
    "Hatachiyama",
    "Oitekaze",
    "Sanoyama",
    "Fujishima",
    "Kataonami",
    "Nishimonai",
  ];
  const CLASSICAL_COMPOUNDS = [
    "Kitanofuji",
    "Wakachiyo",
    "Tochinishiki",
    "Harunoyama",
    "Narutaki",
    "Aoiyama",
    "Irodori",
    "Masuiyama",
  ];

  function mockSeededRNG(nextValue: number, intValues: number[]): SeededRNG {
    let idx = 0;
    return {
      next: () => nextValue,
      int: () => intValues[idx++] ?? intValues[intValues.length - 1] ?? 0,
    } as unknown as SeededRNG;
  }

  function mockSeededRNGTracking(
    nextValue: number,
    intValues: number[]
  ): { rng: SeededRNG; intCalls: () => number } {
    let idx = 0;
    let intCallCount = 0;
    const rng = {
      next: () => nextValue,
      int: () => {
        intCallCount++;
        return intValues[idx++] ?? intValues[intValues.length - 1] ?? 0;
      },
    } as unknown as SeededRNG;
    return { rng, intCalls: () => intCallCount };
  }

  describe("Branch 1: roll < 0.5 (geo prefix + nature suffix)", () => {
    it("roll=0.0, int=[2, 5] → GEO_PREFIXES[2] + NATURE_SUFFIXES[5]", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.0, [2, 5]));
      expect(name).toBe(GEO_PREFIXES[2] + NATURE_SUFFIXES[5]);
      expect(name).toBe("Kitagawa");
    });

    it("roll=0.3, int=[0, 0] → Nishi + noumi = Nishinoumi", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.3, [0, 0]));
      expect(name).toBe("Nishinoumi");
    });

    it("roll=0.49, int=[9, 9] → Bizen + zeki = Bizenzeki (boundary: 0.49 < 0.5)", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.49, [9, 9]));
      expect(name).toBe("Bizenzeki");
    });

    it("calls int() exactly twice (prefix + suffix)", () => {
      const { rng, intCalls } = mockSeededRNGTracking(0.3, [0, 0]);
      generateToshiyoriName(rng);
      expect(intCalls()).toBe(2);
    });
  });

  describe("Branch 2: 0.5 ≤ roll < 0.85 (pool name)", () => {
    it("roll=0.5, int=[0] → TOSHIYORI_NAME_POOL[0] = Saganoumi (boundary: 0.5 is NOT < 0.5)", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.5, [0]));
      expect(name).toBe(TOSHIYORI_NAME_POOL[0]);
      expect(name).toBe("Saganoumi");
    });

    it("roll=0.6, int=[10] → TOSHIYORI_NAME_POOL[10] = Kitazakura", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.6, [10]));
      expect(name).toBe("Kitazakura");
    });

    it("roll=0.84, int=[29] → TOSHIYORI_NAME_POOL[29] = Nishimonai (boundary: 0.84 < 0.85)", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.84, [29]));
      expect(name).toBe("Nishimonai");
    });

    it("calls int() exactly once", () => {
      const { rng, intCalls } = mockSeededRNGTracking(0.6, [0]);
      generateToshiyoriName(rng);
      expect(intCalls()).toBe(1);
    });
  });

  describe("Branch 3: roll ≥ 0.85 (classical compound)", () => {
    it("roll=0.85, int=[0] → CLASSICAL_COMPOUNDS[0] = Kitanofuji (boundary: 0.85 is NOT < 0.85)", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.85, [0]));
      expect(name).toBe(CLASSICAL_COMPOUNDS[0]);
      expect(name).toBe("Kitanofuji");
    });

    it("roll=0.9, int=[3] → CLASSICAL_COMPOUNDS[3] = Harunoyama", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.9, [3]));
      expect(name).toBe("Harunoyama");
    });

    it("roll=0.999, int=[7] → CLASSICAL_COMPOUNDS[7] = Masuiyama", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.999, [7]));
      expect(name).toBe("Masuiyama");
    });

    it("calls int() exactly once", () => {
      const { rng, intCalls } = mockSeededRNGTracking(0.9, [0]);
      generateToshiyoriName(rng);
      expect(intCalls()).toBe(1);
    });
  });

  describe("index validation", () => {
    it("roll=0.3, int=[0, 0] → first geo prefix + first nature suffix", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.3, [0, 0]));
      expect(name).toBe(GEO_PREFIXES[0] + NATURE_SUFFIXES[0]);
    });

    it("roll=0.3, int=[9, 9] → last geo prefix + last nature suffix", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.3, [9, 9]));
      expect(name).toBe(GEO_PREFIXES[9] + NATURE_SUFFIXES[9]);
    });

    it("roll=0.6, int=[0] → first pool name", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.6, [0]));
      expect(name).toBe(TOSHIYORI_NAME_POOL[0]);
    });

    it("roll=0.6, int=[29] → last pool name", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.6, [29]));
      expect(name).toBe(TOSHIYORI_NAME_POOL[TOSHIYORI_NAME_POOL.length - 1]);
    });

    it("roll=0.9, int=[0] → first classical", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.9, [0]));
      expect(name).toBe(CLASSICAL_COMPOUNDS[0]);
    });

    it("roll=0.9, int=[7] → last classical", () => {
      const name = generateToshiyoriName(mockSeededRNG(0.9, [7]));
      expect(name).toBe(CLASSICAL_COMPOUNDS[CLASSICAL_COMPOUNDS.length - 1]);
    });
  });
});
