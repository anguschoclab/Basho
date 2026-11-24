/**
 * shikona/heyaPrefixes.ts
 *
 * Signature naming prefixes for heya — mirrors real-world sumo patterns where
 * most wrestlers in a stable share a prefix (Chiyo- at Kokonoe, Koto- at Sadogatake,
 * Teru- at Isegahama, etc).
 *
 * Usage (in WorldFactory): look up the heya's canonical name; fall back to the
 * oyakata's former-shikona prefix; fall back to a generic house prefix.
 */

import type { Rank } from "@/engine/types/banzuke";

/** Canonical heya-name → preferred prefix. Missing entries use fallback logic. */
export const HEYA_SIGNATURE_PREFIXES: Record<string, string> = {
  // Namesake stables
  Dewanoumi: "Dewa",
  Nishonoseki: "Nishiki",
  Takasago: "Asa",
  Tokitsukaze: "Toki",
  Isegahama: "Teru",
  // Nishonoseki ichimon
  Hanaregoma: "Tamano",
  Hidenoyama: "Koto",
  Kataonami: "Tama",
  Minato: "Mino",
  Minatogawa: "Takakei",
  Nakamura: "Yoshi",
  Naruto: "Oho",
  Nishiiwa: "Waka",
  Onomatsu: "Daido",
  Oshiogawa: "Take",
  Sadogatake: "Koto",
  Shibatayama: "Yoshi",
  Tagonoura: "Kise",
  Takadagawa: "Takano",
  Takekuma: "Goei",
  Tokiwayama: "Takami",
  // Dewanoumi ichimon
  Fujishima: "Musashi",
  Futagoyama: "Waka",
  Ikazuchi: "Kaki",
  Kasugano: "Tochi",
  Kise: "Kise",
  Musashigawa: "Musashi",
  Onoe: "Baruto",
  Otowayama: "Kaku",
  Sakaigawa: "Goei",
  Shikihide: "Hoshi",
  Tamanoi: "Tama",
  Tatsunami: "Hoku",
  Yamahibiki: "Ikio",
  // Isegahama ichimon
  Ajigawa: "Aoi",
  Asahiyama: "Asahi",
  Asakayama: "Asak",
  Oshima: "Kyoku",
  // Tokitsukaze ichimon
  Arashio: "Soko",
  Isenoumi: "Kita",
  Oitekaze: "Dai",
  Shikoroyama: "Homa",
  // Takasago ichimon
  Kokonoe: "Chiyo",
  Hakkaku: "Hokuto",
  Nishikido: "Mito",
};

/**
 * Probability of using the heya prefix for a new shikona by rank.
 * Juniors are most likely to carry the signature; senior wrestlers may have
 * evolved unique names as they climbed.
 */
export const HEYA_PREFIX_PROBABILITY: Record<Rank, number> = {
  jonokuchi: 0.5,
  jonidan: 0.45,
  sandanme: 0.4,
  makushita: 0.38,
  juryo: 0.35,
  maegashira: 0.3,
  komusubi: 0.25,
  sekiwake: 0.22,
  ozeki: 0.18,
  yokozuna: 0.15,
};

/** Extracts the leading 2–4 characters of a shikona as a prefix fallback. */
export function extractPrefixFromShikona(shikona: string): string {
  if (!shikona) return "";
  // Known common prefix patterns (same list as legacy.ts; kept here for import boundary)
  const known = [
    "Taka",
    "Waka",
    "Koto",
    "Tochi",
    "Chiyo",
    "Hoku",
    "Asa",
    "Tera",
    "Dai",
    "Teru",
    "Dewa",
    "Musashi",
    "Haku",
    "Tama",
    "Kise",
    "Haru",
    "Natsu",
    "Aki",
  ];
  for (const p of known) if (shikona.startsWith(p)) return p;
  return shikona.slice(0, Math.min(4, shikona.length));
}
