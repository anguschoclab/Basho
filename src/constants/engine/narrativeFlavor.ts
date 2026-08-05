/**
 * Tier 3 Cosmetic/Narrative Elements
 *
 * Additional flavor text and cosmetic constants for sumo immersion:
 * - Dohyo-iri ceremony descriptions
 * - Kimarite poetic descriptions
 * - Rank-specific honorifics
 * - Seasonal basho flavor text
 */

/** Dohyo-iri ceremony style descriptions */
export const DOHYO_IRI_DESCRIPTIONS: Record<"unryu" | "shiranui", string> = {
  unryu:
    "The Unryu style — one hand extended forward, the other drawn back. " +
    "Named after the cloud dragon, symbolizing a balanced, forward-moving spirit.",
  shiranui:
    "The Shiranui style — both arms raised high in a stance of power. " +
    "Named after the mysterious fire, symbolizing an imposing, dominant presence.",
};

/** Seasonal basho flavor text */
export const BASHO_SEASONAL_FLAVOR: Record<string, string> = {
  hatsu: "The New Year basho — fresh beginnings and resolutions in the cold Tokyo winter.",
  haru: "The Spring basho — cherry blossoms and renewal in Osaka.",
  natsu: "The Summer basho — heat and intensity in the sweltering Tokyo summer.",
  nagoya: "The Nagoya basho — midsummer battles in the humid Chubu region.",
  aki: "The Autumn basho — cooling temperatures and changing leaves in Tokyo.",
  kyushu: "The Kyushu basho — year-end battles in the warm southern island.",
};

/** Rank-specific honorific prefixes for narrative text */
export const RANK_HONORIFICS: Record<string, string> = {
  yokozuna: "Grand Champion",
  ozeki: "Champion",
  sekiwake: "Junior Champion",
  komusubi: "Junior Champion Second Class",
  maegashira: "Maegashira",
  juryo: "Juryo",
  makushita: "Makushita",
  sandanme: "Sandanme",
  jonidan: "Jonidan",
  jonokuchi: "Jonokuchi",
};

/** Kimarite poetic descriptions (subset of winning techniques) */
export const KIMARITE_DESCRIPTIONS: Record<string, string> = {
  yorikiri: "A frontal force-out — the most fundamental and honorable winning technique.",
  uwatenage: "An overarm throw — using the opponent's mawashi grip to hurl them down.",
  oshidashi: "A frontal push-out — driving the opponent backward and out.",
  hatakikomi: "A slap-down — exploiting the opponent's forward momentum.",
  shitatenage: "An underarm throw — using a low grip to spin the opponent down.",
  abisetaoshi: "A backward force-down — pushing the opponent down from above.",
  tsukiotoshi: "A thrust-down — a powerful push that sends the opponent sprawling.",
  yoritaoshi: "A frontal crush-out — overwhelming the opponent with body weight.",
};

/**
 * Get the dohyo-iri description for a given style.
 */
export function getDohyoIriDescription(style: "unryu" | "shiranui"): string {
  return DOHYO_IRI_DESCRIPTIONS[style];
}

/**
 * Get seasonal flavor text for a basho.
 */
export function getBashoFlavor(bashoName: string): string {
  return BASHO_SEASONAL_FLAVOR[bashoName] ?? `${bashoName} basho — the grand tournament continues.`;
}

/**
 * Get the honorific for a rank.
 */
export function getRankHonorific(rank: string): string {
  return RANK_HONORIFICS[rank] ?? rank;
}

/**
 * Get the poetic description for a kimarite.
 */
export function getKimariteDescription(kimarite: string): string {
  return KIMARITE_DESCRIPTIONS[kimarite] ?? `${kimarite} — a specialized winning technique.`;
}
