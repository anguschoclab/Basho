import { describe, it, expect } from "vitest";
import { SeededRNG } from "@/engine/rng";
import { generateToshiyoriName } from "../toshiyoriNames";

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
