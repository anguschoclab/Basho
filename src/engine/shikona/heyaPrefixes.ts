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

import type { Rank } from "../types/banzuke";

/** Canonical heya-name → preferred prefix. Missing entries use fallback logic. */
export const HEYA_SIGNATURE_PREFIXES: Record<string, string> = {
  Dewanoumi: "Dewa",
  Nishonoseki: "Nishiki",
  Takasago: "Asa",
  Tokitsukaze: "Toki",
  Isegahama: "Teru",
  Sakaigawa: "Goei",
  Kasugano: "Tochi",
  Kokonoe: "Chiyo",
  Kise: "Kise",
  Musashigawa: "Musashi",
  Kataonami: "Tama",
  Onoe: "Baruto",
  Tatsunami: "Hoku",
  Minezaki: "Mine",
  Tamanoi: "Tama",
  Isenoumi: "Ikio",
  Ajigawa: "Aoi",
  Sadogatake: "Koto",
  Hakkaku: "Hokuto",
  Shibatayama: "Yoshi",
  Michinoku: "Kiri",
  Miyagino: "Haku",
  Oigami: "Oho",
  Tagonoura: "Kise",
  Naruto: "Oho",
  Arashio: "Soko",
  Asakayama: "Asak",
  Nakagawa: "Asa",
  Shikihide: "Hoshi",
  Yamahibiki: "Ikio",
  Irumagawa: "Tochi",
  Hanahago: "Hana",
  Shirane: "Shira",
  Futagoyama: "Waka",
  Fujishima: "Musashi",
  Takadagawa: "Takano",
  Magaki: "Waka",
  Katsushika: "Kotobu",
  Oshogatsu: "Haru",
  Chiganoura: "Taka",
  Minato: "Mino",
  Shikoroyama: "Homa",
  Kagamiyama: "Taganoyama",
  Hanakago: "Hana",
  Oguruma: "Yago",
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
