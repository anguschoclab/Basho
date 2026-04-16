/**
 * Heya Brand Identity Generator
 *
 * Generates permanent brand identities for each heya at world creation.
 * These identities influence kesho-mawashi designs for all sekitori from that stable.
 */

import type { Id } from "../../types/common";
import type { Heya } from "../../types/heya";
import type { HeyaBrandIdentity, CrestMotif } from "../../types/keshoMawashi";
import type { SeededRNG } from "../../rng";
import { rngFromSeed } from "../../rng";

/** Heya names and their traditional color associations (when applicable) */
const HEYA_NAME_TRADITIONS: Record<string, { colors: string[]; motifs: CrestMotif[] }> = {
  Dewanoumi: { colors: ["#1E3A5F", "#FFFFFF", "#FFD700"], motifs: ["waves", "temple", "dragon"] },
  Nishonoseki: {
    colors: ["#8B0000", "#FFFFFF", "#FFD700"],
    motifs: ["phoenix", "tiger", "rising_sun"],
  },
  Takasago: { colors: ["#0066CC", "#FFFFFF", "#FFD700"], motifs: ["waves", "pine", "crane"] },
  Tokitsukaze: { colors: ["#228B22", "#FFFFFF", "#FFD700"], motifs: ["bamboo", "waves", "dragon"] },
  Isegahama: {
    colors: ["#4A0080", "#FFFFFF", "#C0C0C0"],
    motifs: ["lightning", "mountain", "temple"],
  },
  Sakaigawa: { colors: ["#4682B4", "#FFFFFF", "#FFD700"], motifs: ["waterfall", "waves", "crane"] },
  Kasugano: {
    colors: ["#800080", "#FFD700", "#FFFFFF"],
    motifs: ["phoenix", "sakura", "dragon"],
  },
  Kokonoe: { colors: ["#CC0000", "#FFFFFF", "#FFD700"], motifs: ["dragon", "tiger", "phoenix"] },
  Kise: { colors: ["#006400", "#FFFFFF", "#FFD700"], motifs: ["pine", "bamboo", "crane"] },
  Musashigawa: {
    colors: ["#2F4F4F", "#FFFFFF", "#C0C0C0"],
    motifs: ["waves", "mountain", "temple"],
  },
  Kataonami: { colors: ["#1E90FF", "#FFFFFF", "#FFD700"], motifs: ["waves", "dragon", "crane"] },
  Onoe: { colors: ["#8B4513", "#FFD700", "#FFFFFF"], motifs: ["temple", "pine", "dragon"] },
  Tatsunami: {
    colors: ["#FF4500", "#FFFFFF", "#FFD700"],
    motifs: ["dragon", "waves", "rising_sun"],
  },
  Minezaki: { colors: ["#556B2F", "#FFFFFF", "#DAA520"], motifs: ["pine", "mountain", "temple"] },
  Tamanoi: { colors: ["#4682B4", "#FFFFFF", "#B8860B"], motifs: ["waves", "crane", "dragon"] },
  Isenoumi: {
    colors: ["#000080", "#FFFFFF", "#FFD700"],
    motifs: ["waves", "dragon", "carp"],
  },
  Ajigawa: { colors: ["#008080", "#FFFFFF", "#FFD700"], motifs: ["waterfall", "bamboo", "crane"] },
  Sadogatake: { colors: ["#191970", "#FFFFFF", "#C0C0C0"], motifs: ["waves", "carp", "pine"] },
  Hakkaku: { colors: ["#8B0000", "#FFD700", "#FFFFFF"], motifs: ["phoenix", "dragon", "tiger"] },
  Shibatayama: {
    colors: ["#696969", "#FFFFFF", "#FFD700"],
    motifs: ["mountain", "pine", "temple"],
  },
  Michinoku: { colors: ["#2E8B57", "#FFFFFF", "#FFD700"], motifs: ["dragon", "bamboo", "waves"] },
  Miyagino: {
    colors: ["#4169E1", "#FFFFFF", "#FFD700"],
    motifs: ["phoenix", "rising_sun", "sakura"],
  },
  Oigami: {
    colors: ["#DC143C", "#FFFFFF", "#FFD700"],
    motifs: ["lightning", "lightning", "dragon"],
  },
  Tagonoura: { colors: ["#006400", "#FFFFFF", "#DAA520"], motifs: ["pine", "mountain", "crane"] },
  Naruto: { colors: ["#FF6347", "#FFFFFF", "#000080"], motifs: ["waves", "dragon", "carp"] },
  Arashio: { colors: ["#4682B4", "#FFFFFF", "#B0C4DE"], motifs: ["waves", "dragon", "lightning"] },
  Asakayama: {
    colors: ["#8B4513", "#FFD700", "#FFFFFF"],
    motifs: ["mountain", "rising_sun", "temple"],
  },
  Nakagawa: { colors: ["#1E90FF", "#FFFFFF", "#FFD700"], motifs: ["dragon", "waves", "crane"] },
  Shikihide: {
    colors: ["#9370DB", "#FFFFFF", "#FFD700"],
    motifs: ["sakura", "dragon", "sakura"],
  },
  Yamahibiki: { colors: ["#2F4F4F", "#FFFFFF", "#C0C0C0"], motifs: ["mountain", "dragon", "pine"] },
  Irumagawa: { colors: ["#4169E1", "#FFFFFF", "#87CEEB"], motifs: ["dragon", "dragon", "crane"] },
  Hanahago: { colors: ["#FF69B4", "#FFFFFF", "#FFD700"], motifs: ["sakura", "sakura", "dragon"] },
  Shirane: { colors: ["#708090", "#FFFFFF", "#C0C0C0"], motifs: ["mountain", "dragon", "pine"] },
  Futagoyama: {
    colors: ["#228B22", "#FFFFFF", "#FFD700"],
    motifs: ["mountain", "dragon", "dragon"],
  },
  Fujishima: { colors: ["#800080", "#FFFFFF", "#FFD700"], motifs: ["dragon", "temple", "dragon"] },
  Takadagawa: {
    colors: ["#B22222", "#FFFFFF", "#FFD700"],
    motifs: ["waterfall", "temple", "dragon"],
  },
  Magaki: { colors: ["#006400", "#FFFFFF", "#DAA520"], motifs: ["dragon", "temple", "pine"] },
  Katsushika: { colors: ["#4A0080", "#FFFFFF", "#FFD700"], motifs: ["dragon", "dragon", "waves"] },
  Oshogatsu: {
    colors: ["#CC0000", "#FFD700", "#FFFFFF"],
    motifs: ["dragon", "dragon", "pine"],
  },
  Chiganoura: { colors: ["#008B8B", "#FFFFFF", "#FFD700"], motifs: ["dragon", "waves", "carp"] },
  Minato: { colors: ["#000080", "#FFFFFF", "#FFD700"], motifs: ["dragon", "carp", "waves"] },
  Shikoroyama: {
    colors: ["#556B2F", "#FFFFFF", "#DAA520"],
    motifs: ["dragon", "mountain", "dragon"],
  },
  Kagamiyama: {
    colors: ["#1E90FF", "#FFFFFF", "#C0C0C0"],
    motifs: ["dragon", "mountain", "dragon"],
  },
  Hanakago: { colors: ["#FF1493", "#FFFFFF", "#FFD700"], motifs: ["sakura", "dragon", "sakura"] },
  Oguruma: { colors: ["#8B4513", "#FFD700", "#FFFFFF"], motifs: ["dragon", "dragon", "temple"] },
};

/** Default colors for heyas without specific traditions */
const DEFAULT_HEYA_COLORS = [
  ["#1E3A5F", "#FFFFFF", "#FFD700"], // Navy/White/Gold
  ["#8B0000", "#FFFFFF", "#FFD700"], // Dark Red/White/Gold
  ["#006400", "#FFFFFF", "#DAA520"], // Dark Green/White/Gold
  ["#4A0080", "#FFFFFF", "#C0C0C0"], // Purple/White/Silver
  ["#8B4513", "#FFD700", "#FFFFFF"], // SaddleBrown/Gold/White
  ["#2F4F4F", "#FFFFFF", "#C0C0C0"], // DarkSlateGray/White/Silver
];

/** Default crest motifs */
const DEFAULT_MOTIFS: CrestMotif[] = [
  "dragon",
  "phoenix",
  "tiger",
  "waves",
  "pine",
  "bamboo",
  "crane",
  "temple",
  "mountain",
  "sakura",
];

/** Crest styles for variety */
const CREST_STYLES: Array<
  | "circular"
  | "shield"
  | "diamond"
  | "oval"
  | "square"
  | "hexagonal"
  | "star"
  | "octagonal"
  | "triangular"
  | "crescent"
> = [
  "circular",
  "shield",
  "diamond",
  "oval",
  "square",
  "hexagonal",
  "star",
  "octagonal",
  "triangular",
  "crescent",
];

/**
 * Generate brand identities for all heyas in the world.
 * Called during world creation.
 */
export function generateHeyaBrandIdentities(
  worldRng: SeededRNG,
  heyaMap: Map<string, Heya>
): Map<string, HeyaBrandIdentity> {
  const brandMap = new Map<string, HeyaBrandIdentity>();

  for (const heya of heyaMap.values()) {
    const brand = generateSingleHeyaBrand(worldRng, heya);
    brandMap.set(brand.id, brand);
    // Link heya to brand
    heya.brandIdentityId = brand.id;
  }

  return brandMap;
}

/**
 * Generate a brand identity for a single heya.
 */
function generateSingleHeyaBrand(rng: SeededRNG, heya: Heya): HeyaBrandIdentity {
  const brandId = rng.uuid("HB");
  const seedPrefix = `${rng.seed}::brand::${heya.id}`;
  const brandRng = rngFromSeed(seedPrefix, "brand", heya.id);

  // Check if heya has traditional associations
  const tradition = HEYA_NAME_TRADITIONS[heya.name];

  // Generate colors
  const colors = tradition ? tradition.colors : brandRng.pick(DEFAULT_HEYA_COLORS);

  // Generate motif
  const crestMotif = tradition ? brandRng.pick(tradition.motifs) : brandRng.pick(DEFAULT_MOTIFS);

  // Generate crest style
  const crestStyle = brandRng.pick(CREST_STYLES);

  // Generate tradition level (0.3 - 0.9)
  // Influenced by oyakata archetype if available
  const traditionLevel = 0.3 + brandRng.next() * 0.6;

  return {
    id: brandId,
    heyaId: heya.id,
    primaryColor: colors[0],
    secondaryColor: colors[1],
    accentColor: colors[2],
    crestMotif,
    crestStyle,
    traditionLevel,
    createdAt: { year: 2025, basho: "hatsu" }, // Default world start
  };
}

/**
 * Get brand identity for a heya.
 */
export function getHeyaBrand(
  brandMap: Map<string, HeyaBrandIdentity>,
  heyaId: Id
): HeyaBrandIdentity | undefined {
  return brandMap.get(heyaId);
}

/**
 * Update tradition level based on oyakata archetype.
 * Called after oyakata generation.
 */
export function adjustBrandForOyakata(
  brand: HeyaBrandIdentity,
  oyakataArchetype: string
): HeyaBrandIdentity {
  const traditionModifiers: Record<string, number> = {
    traditionalist: 0.2,
    tyrant: 0.1,
    nurturer: -0.05,
    scientist: -0.1,
    gambler: -0.05,
    strategist: 0,
    strict: 0.1,
    indulgent: -0.1,
  };

  const modifier = traditionModifiers[oyakataArchetype] || 0;
  const newTraditionLevel = Math.max(0, Math.min(1, brand.traditionLevel + modifier));

  return {
    ...brand,
    traditionLevel: newTraditionLevel,
  };
}
