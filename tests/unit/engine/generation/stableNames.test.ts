/**
 * Spec — genesis stable roster is the real 45 heya (JSA 2026).
 *
 * Grand sumo fields exactly 45 active stables. Genesis previously drew from a
 * list containing closed stables (Miyagino, Irumagawa, Chiganoura,
 * Kagamiyama, Minezaki, Oguruma) and invented ones (Oigami, Nakagawa,
 * Hanahago, Shirane, Katsushika, Oshogatsu, Hanakago), while ~15 real
 * actives were missing (Oitekaze, Asahiyama, Otowayama, Hanaregoma,
 * Nakamura, Onomatsu, Takekuma, Tokiwayama, Minatogawa, Ikazuchi, Nishiiwa,
 * Oshiogawa, Hidenoyama, Oshima, Nishikido…).
 */
import { describe, it, expect } from "vitest";
import { createStables } from "@/engine/generation/HeyaFactory";
import { rngFromSeed } from "@/engine/core/rng";

/** The real 45 active heya (JSA, 2026 season). */
const REAL_45 = new Set([
  // Nishonoseki ichimon (17)
  "Nishonoseki",
  "Hanaregoma",
  "Hidenoyama",
  "Kataonami",
  "Minato",
  "Minatogawa",
  "Nakamura",
  "Naruto",
  "Nishiiwa",
  "Onomatsu",
  "Oshiogawa",
  "Sadogatake",
  "Shibatayama",
  "Tagonoura",
  "Takadagawa",
  "Takekuma",
  "Tokiwayama",
  // Dewanoumi ichimon (14)
  "Dewanoumi",
  "Fujishima",
  "Futagoyama",
  "Ikazuchi",
  "Kasugano",
  "Kise",
  "Musashigawa",
  "Onoe",
  "Otowayama",
  "Sakaigawa",
  "Shikihide",
  "Tamanoi",
  "Tatsunami",
  "Yamahibiki",
  // Isegahama ichimon (5)
  "Isegahama",
  "Ajigawa",
  "Asahiyama",
  "Asakayama",
  "Oshima",
  // Tokitsukaze ichimon (5)
  "Tokitsukaze",
  "Arashio",
  "Isenoumi",
  "Oitekaze",
  "Shikoroyama",
  // Takasago ichimon (4)
  "Takasago",
  "Kokonoe",
  "Hakkaku",
  "Nishikido",
]);

/** Names that must not appear — closed or invented stables. */
const RETIRED_NAMES = new Set([
  "Miyagino", // closed 2024 — roster absorbed by Isegahama
  "Irumagawa", // closed 2023 — merged into Ikazuchi
  "Chiganoura",
  "Kagamiyama",
  "Minezaki",
  "Oguruma",
  "Magaki",
  // Invented filler stables
  "Oigami",
  "Nakagawa",
  "Hanahago",
  "Shirane",
  "Katsushika",
  "Oshogatsu",
  "Hanakago",
]);

describe("genesis stable roster — real 45", () => {
  const { heyaMap } = createStables(rngFromSeed("stable-names", "worldgen", "world"));
  const names = new Set([...heyaMap.values()].map((h) => h.name));

  it("fields exactly the real 45 stables", () => {
    expect(names).toEqual(REAL_45);
  });

  it("contains no closed or invented stables", () => {
    for (const dead of RETIRED_NAMES) {
      expect(names.has(dead)).toBe(false);
    }
  });
});
