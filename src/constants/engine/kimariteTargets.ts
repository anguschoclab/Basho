/**
 * kimariteTargets.ts
 * ==================
 * Leaf module: real-world kimarite frequency targets (makuuchi), sourced from
 * SumoFans / sumodb lifetime statistics (≈56,600 makuuchi bouts, 1958–2026).
 *
 * Intentionally import-free so both the engine registry (rarity derivation)
 * and the aggregation module (kimariteFrequencies.ts) can consume it without
 * a dependency cycle.
 *
 * Values are fractional shares of all bout endings (win + loss). Hiwaza
 * (non-technique results) and forfeits (fusensho/hansoku) are included so the
 * table models a complete bout-ending distribution.
 */

export type KimariteRarity = "common" | "uncommon" | "rare" | "legendary";

/**
 * Fractional share of all bout endings per kimarite (makuuchi, all-time).
 * Head of distribution pinned to observed real-world values; long tail
 * approximated for techniques with too few recorded instances to measure.
 */
export const KIMARITE_FREQUENCY_TARGETS: Record<string, number> = {
  // ── Kihonwaza (basic techniques) ─────────────────────────────────────────
  yorikiri: 0.296,
  oshidashi: 0.168,
  tsukidashi: 0.023,
  oshitaoshi: 0.022,
  yoritaoshi: 0.014,
  tsukitaoshi: 0.006,
  abisetaoshi: 0.0025,

  // ── Tokushuwaza (special techniques) ─────────────────────────────────────
  hatakikomi: 0.07,
  hikiotoshi: 0.054,
  okuridashi: 0.045,
  okuritaoshi: 0.013,
  utchari: 0.009,
  katasukashi: 0.007,
  tsuriotoshi: 0.007,
  kimedashi: 0.005,
  kimetaoshi: 0.004,
  tsuridashi: 0.001,
  sokubiotoshi: 0.001,
  okurigake: 0.0008,
  okurihikiotoshi: 0.0008,
  waridashi: 0.0005,
  okurinage: 0.0004,
  okuritsuriotoshi: 0.0004,
  tsukaminage: 0.0003,
  yobimodoshi: 0.0003,
  ushiromotare: 0.0003,
  okuritsuridashi: 0.0002,

  // ── Forfeits (not techniques, but real bout endings) ──────────────────────
  fusensho: 0.005,
  hansoku: 0.0004,

  // ── Nageite (throws) ─────────────────────────────────────────────────────
  uwatenage: 0.061,
  shitatenage: 0.045,
  kotenage: 0.036,
  sukuinage: 0.027,
  kubinage: 0.006,
  shitatedashinage: 0.006,
  uwatedashinage: 0.005,
  ipponzeoi: 0.0008,
  kakenage: 0.0005,
  koshihineri: 0.0005,
  yaguranage: 0.0004,
  nichonage: 0.0003,

  // ── Hinerite (twists / pull-downs) ────────────────────────────────────────
  tsukiotoshi: 0.031,
  tottari: 0.01,
  shitatehineri: 0.004,
  uwatehineri: 0.004,
  kotehineri: 0.0015,
  amiuchi: 0.0015,
  kainahineri: 0.001,
  sabaori: 0.001,
  zubuneri: 0.0008,
  sakatottari: 0.0006,
  kubiotoshi: 0.0005,
  gasshohineri: 0.0003,
  harimanage: 0.0003,
  osakate: 0.0003,
  sotokomata_hinerite: 0.0003,
  tokkurinage: 0.0003,
  makiotoshi: 0.0003,
  uchimuso: 0.0003,
  sotomuso: 0.0003,

  // ── Kakeite (leg techniques) ──────────────────────────────────────────────
  sotogake: 0.004,
  uchigake: 0.004,
  ashitori: 0.003,
  ketaguri: 0.003,
  watashikomi: 0.002,
  kekaeshi: 0.002,
  kosotogake: 0.001,
  komatasukui: 0.0008,
  chongake: 0.0006,
  kawarigake: 0.0005,
  susoharai: 0.0005,
  kirikaeshi: 0.0004,
  nimaigeri: 0.0003,
  omata: 0.0003,
  susotori: 0.0003,
  mitokorozeme: 0.0003,
  kosotogari: 0.0003,
  tsumatori: 0.0003,

  // ── Sorite (backwards body-drop throws — vanishingly rare) ────────────────
  izori: 0.0007,
  kakezori: 0.0007,
  shumokuzori: 0.0007,
  sototasukizori: 0.0007,
  tasukizori: 0.0007,
  tsutaezori: 0.0007,

  // ── Hiwaza (non-technique endings — loser defeats themselves) ────────────
  isamiashi: 0.004,
  fumidashi: 0.004,
  koshikudake: 0.0019,
  tsukite: 0.0015,
  tsukihiza: 0.0015,
};

/**
 * Map a real-world share to a display rarity tier.
 * Thresholds: ≥8% common, ≥1.5% uncommon, ≥0.2% rare, below that legendary.
 */
export function rarityFromShare(share: number): KimariteRarity {
  if (share >= 0.08) return "common";
  if (share >= 0.015) return "uncommon";
  if (share >= 0.002) return "rare";
  return "legendary";
}

/** Target share for a kimarite id; 0 for unknown/untechnique ids. */
export function getKimariteTargetShare(id: string): number {
  return KIMARITE_FREQUENCY_TARGETS[id] ?? 0;
}
