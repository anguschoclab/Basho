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

// === Equipment & Apparel ===

/** Kesho-mawashi (ceremonial apron) descriptions for sekitori */
export const KESHO_MAWASHI_DESCRIPTION =
  "A kesho-mawashi — the ornate ceremonial apron worn by sekitori during the dohyo-iri procession. " +
  "Each is uniquely designed with the rikishi's chosen motifs and sponsor crests.";

/** Mawashi (competition belt) description */
export const MAWASHI_DESCRIPTION =
  "The mawashi — the heavy silk belt wrapped around the rikishi's waist, " +
  "the grip on which determines the bout's strategy and outcome.";

/** Fundoshi (undergarment) description */
export const FUNDOSHI_DESCRIPTION =
  "The fundoshi — the traditional Japanese undergarment worn beneath the mawashi, " +
  "essential for proper sumo attire.";

/** Yukata (casual wear) description */
export const YUKATA_DESCRIPTION =
  "The yukata — a casual summer kimono worn by rikishi outside the dohyo, " +
  "a symbol of the disciplined sumo lifestyle.";

/** Katahada (bare shoulder) description */
export const KATAHADA_DESCRIPTION =
  "Katahada — the bare-shoulder appearance of a rikishi in formal attire, " +
  "a distinctive look during press conferences and public appearances.";

// === Dohyo & Shrine Elements ===

/** Shimenawa (sacred rope) description */
export const SHIMENAWA_DESCRIPTION =
  "The shimenawa — the sacred Shinto rope suspended above the dohyo, " +
  "marking the ring as a consecrated space and warding off impurity.";

/** Shide (paper streamers) description */
export const SHIDE_DESCRIPTION =
  "The shide — zigzag paper streamers attached to the shimenawa, " +
  "fluttering as a sign of the divine presence in the dohyo.";

/** Dohyo-matsuri (ring purification ceremony) description */
export const DOHYO_MATSURI_DESCRIPTION =
  "The dohyo-matsuri — a Shinto purification ceremony performed before each basho, " +
  "where a priest blesses the dohyo with salt, sake, and prayers for safe competition.";

/** Kohaku-maku (curtain) description */
export const KOHAKU_MAKU_DESCRIPTION =
  "The kohaku-maku — the red-and-white curtain draped behind the dohyo, " +
  "a traditional backdrop for all official sumo ceremonies.";

// === Pre/Post-Bout Rituals ===

/** Chikara-mizu (power water) description */
export const CHIKARA_MIZU_DESCRIPTION =
  "Chikara-mizu — the ritual water offered by a lower-ranked rikishi to a higher-ranked one " +
  "before the bout, symbolizing purification and respect.";

/** Chikara-gami (power paper) description */
export const CHIKARA_GAMI_DESCRIPTION =
  "Chikara-gami — the ritual paper offered alongside chikara-mizu, " +
  "used by the rikishi to wipe their face before the bout begins.";

/** Yumitori-shiki (bow-twirling ceremony) description */
export const YUMITORI_SHIKI_DESCRIPTION =
  "The yumitori-shiki — the closing ceremony of each basho day, " +
  "where a designated rikishi twirls a long bow in a graceful archery dance " +
  "to give thanks for the day's safe competition.";

// === Seasonal & Special Events ===

/** Kagami-mochi (New Year rice cakes) description */
export const KAGAMI_MOCHI_DESCRIPTION =
  "Kagami-mochi — the New Year's rice cakes displayed in the heya, " +
  "symbolizing prosperity and good fortune for the coming year of sumo.";

/** Tenran-zumo (imperial presence sumo) description */
export const TENRAN_ZUMO_DESCRIPTION =
  "Tenran-zumo — a rare and prestigious exhibition performed before the Emperor, " +
  "an honor bestowed only on the most distinguished rikishi of the era.";

// === Crowd Atmosphere ===

/** Kakegoe (cheering calls) description */
export const KAKEGOE_DESCRIPTION =
  "Kakegoe — the rhythmic shouts and calls from the knowledgeable sumo audience, " +
  "where fans call out the shikona of favored rikishi in traditional stylized voices.";

/** Fure-daiko (heralding drum) description */
export const FURE_DAIKO_DESCRIPTION =
  "The fure-daiko — the deep taiko drum that heralds the start of each basho day, " +
  "its resonant boom echoing through the kokugikan.";

/** Hyoshigi (wooden clappers) description */
export const HYOSHIGI_DESCRIPTION =
  "The hyoshigi — wooden clappers struck in rhythm to announce the progression " +
  "of the basho schedule and the approach of the next division's bouts.";

// === Calligraphy & Styling ===

/** Sumo-ji (sumo calligraphy) description */
export const SUMO_JI_DESCRIPTION =
  "Sumo-ji — the bold, angular calligraphy style used for writing banzuke and shikona, " +
  "each stroke conveying strength and tradition.";

/** Edomoji (Edo-period lettering) description */
export const EDOMOJI_DESCRIPTION =
  "Edomoji — the decorative Edo-period lettering style used on nobori banners " +
  "and heya signage throughout the sumo world.";

/** Binzuke (hair styling wax) description */
export const BINZUKE_DESCRIPTION =
  "Binzuke — the fragrant styling wax used to shape the chonmage and oichomage, " +
  "giving the rikishi's topknot its distinctive sheen and structure.";

// === Personality Descriptors ===

/** Soppugata (slender build) description */
export const SOPPUGATA_DESCRIPTION =
  "Soppugata — a slender, agile body type suited to oshi-zumo techniques, " +
  "favoring speed and thrusting over belt grappling.";

/** Ankogata (heavy build) description */
export const ANKOGATA_DESCRIPTION =
  "Ankogata — a heavy, powerful body type suited to yotsu-zumo techniques, " +
  "favoring belt grappling and overwhelming force.";

// === Gyoji Prop ===

/** Gunbai (war fan) description */
export const GUNBAI_DESCRIPTION =
  "The gunbai — the gyoji's war fan, raised to indicate the initial winner of a bout. " +
  "When a mono-ii overturns the call, the gunbai is reversed — a moment of drama and controversy.";

// === Helper Functions ===

/**
 * Get the poetic description for a kimarite.
 */
export function getKimariteDescription(kimarite: string): string {
  return KIMARITE_DESCRIPTIONS[kimarite] ?? `${kimarite} — a specialized winning technique.`;
}

/**
 * Get a pre-bout ritual description sequence.
 */
export function getPreBoutRitualText(): string {
  return `${CHIKARA_MIZU_DESCRIPTION} ${CHIKARA_GAMI_DESCRIPTION}`;
}

/**
 * Get a post-basho-day ceremony description.
 */
export function getClosingCeremonyText(): string {
  return YUMITORI_SHIKI_DESCRIPTION;
}

/**
 * Get a pre-basho purification ceremony description.
 */
export function getPreBashoCeremonyText(): string {
  return `${DOHYO_MATSURI_DESCRIPTION} ${SHIMENAWA_DESCRIPTION}`;
}

/**
 * Get body type descriptor for a rikishi.
 */
export function getBodyTypeDescription(build: "slender" | "heavy"): string {
  return build === "slender" ? SOPPUGATA_DESCRIPTION : ANKOGATA_DESCRIPTION;
}
