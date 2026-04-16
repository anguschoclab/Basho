/**
 * Kesho-Mawashi (Ceremonial Apron) Types
 *
 * Defines the ceremonial apron system for sekitori (juryo and makuuchi wrestlers).
 * Each sekitori receives a unique kesho-mawashi upon promotion, featuring designs
 * inspired by heya branding, traditional motifs, corporate sponsors, or national heritage.
 */

import type { Id } from "./common";
import type { Rank, Division } from "./banzuke";

/** Design tier based on rikishi rank - affects ornamentation level */
export type KeshoTier = "juryo" | "makuuchi" | "sanyaku" | "yokozuna";

/** Source of design inspiration for the kesho-mawashi */
export type DesignOrigin = "corporate" | "traditional" | "national" | "heya_legacy";

/** Traditional Japanese motifs used in mawashi designs */
export type TraditionalMotif =
  | "dragon"
  | "phoenix"
  | "tiger"
  | "mt_fuji"
  | "waves"
  | "sakura"
  | "pine"
  | "bamboo"
  | "crane"
  | "rising_sun"
  | "lightning"
  | "waterfall"
  | "temple"
  | "treasure_ship"
  | "carp"
  | "lotus"
  | "thunder"
  | "wind"
  | "mountain"
  | "ship"
  | "whirlpool"
  | "storm"
  | "sunrise"
  | "river"
  | "flower"
  | "butterfly"
  | "echo"
  | "sky"
  | "snow"
  | "twin"
  | "cloud"
  | "wisteria"
  | "moon"
  | "autumn"
  | "fence"
  | "poetry"
  | "new_year"
  | "bay"
  | "harbor"
  | "moist"
  | "mist"
  | "mirror"
  | "lake"
  | "basket"
  | "wheel"
  | "cart";

/** Crest motifs that have visual renderings in crestMotifs.tsx */
export type CrestMotif =
  | "mountain"
  | "wave"
  | "waves"
  | "circle"
  | "diamond"
  | "star"
  | "chrysanthemum"
  | "bamboo"
  | "pine"
  | "plum"
  | "crane"
  | "torii"
  | "dragon"
  | "phoenix"
  | "tiger"
  | "sakura"
  | "rising_sun"
  | "lightning"
  | "waterfall"
  | "temple"
  | "carp";

/** Heya brand identity - generated at world creation, permanent per stable */
export interface HeyaBrandIdentity {
  id: Id;
  heyaId: Id;

  // Color palette (hex format)
  primaryColor: string;
  secondaryColor: string;
  accentColor: string; // Gold/silver thread color

  // Crest design
  crestMotif: CrestMotif;
  crestStyle:
    | "circular"
    | "shield"
    | "diamond"
    | "oval"
    | "square"
    | "hexagonal"
    | "star"
    | "octagonal"
    | "triangular"
    | "crescent";

  // Tradition level affects probability of legacy designs (0-1)
  traditionLevel: number;

  // Generated metadata
  createdAt: { year: number; basho: string };
}

/** Base pattern style for the apron background */
export type BasePattern =
  | "solid"
  | "striped"
  | "gradient"
  | "cloud"
  | "ray"
  | "checkered"
  | "waves"
  | "scales"
  | "geometric"
  | "dragon"
  | "phoenix"
  | "floral"
  | "tribal"
  | "lattice"
  | "hexagonal"
  | "damask"
  | "ikat"
  | "plaid"
  | "chevron"
  | "paisley";

/** Symbol position on the mawashi */
export type SymbolPosition =
  | "center"
  | "left"
  | "right"
  | "scattered"
  | "upper"
  | "lower"
  | "diagonal"
  | "corners"
  | "border"
  | "concentric";

/** Border style for the mawashi edge */
export type BorderStyle = "simple" | "double" | "ornate" | "rope" | "scalloped";

/** Embroidery style for the mawashi */
export type EmbroideryStyle = "satin" | "chain" | "couching" | "goldwork";

/** Seasonal information for basho-specific variations */
export type Season = "spring" | "summer" | "autumn" | "winter";

/** Seasonal color palettes */
export const SEASONAL_PALETTES: Record<Season, string[]> = {
  spring: ["#FFB7C5", "#FF69B4", "#90EE90", "#98FB98", "#FFA07A", "#FFD700"],
  summer: ["#87CEEB", "#00CED1", "#1E90FF", "#40E0D0", "#FF6347", "#FFD700"],
  autumn: ["#FF8C00", "#FF4500", "#8B4513", "#D2691E", "#CD853F", "#FFD700"],
  winter: ["#E0FFFF", "#F0F8FF", "#B0C4DE", "#708090", "#4682B4", "#C0C0C0"],
};

/** Seasonal motif associations */
export const SEASONAL_MOTIFS: Record<Season, TraditionalMotif[]> = {
  spring: ["sakura", "flower", "butterfly", "rising_sun", "wisteria"],
  summer: ["waves", "waterfall", "river", "thunder", "lightning"],
  autumn: ["moon", "flower", "cloud", "mountain", "temple"],
  winter: ["snow", "pine", "bamboo", "mountain", "cloud"],
};

/** Get season from basho name */
export function getSeasonFromBasho(basho: string): Season {
  const lowerBasho = basho.toLowerCase();
  if (lowerBasho.includes("hatsu") || lowerBasho.includes("haru")) return "spring";
  if (lowerBasho.includes("natsu")) return "summer";
  if (lowerBasho.includes("aki")) return "autumn";
  if (lowerBasho.includes("kyushu")) return "winter";
  return "spring"; // default
}

/** Symbol element on the mawashi */
export interface KeshoSymbol {
  type:
    | "motif"
    | "corporate_logo"
    | "national_flag"
    | "heya_crest"
    | "oyakata_legacy"
    | "personal_seal";
  value: TraditionalMotif | string;
  position: SymbolPosition;
  size: "small" | "medium" | "large";
  prominence: number; // 0-1, affects visual weight
}

/** A kesho-mawashi instance attached to a rikishi */
export interface KeshoMawashi {
  id: Id;
  rikishiId: Id;

  // Tier and origin
  tier: KeshoTier;
  origin: DesignOrigin;

  // Visual design components
  basePattern: BasePattern;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  goldThreadDensity: number; // 0-1, embroidery richness
  borderStyle: BorderStyle; // Border style for the mawashi edge
  embroideryStyle: EmbroideryStyle; // Embroidery technique

  // Symbol elements (1-3 elements typically)
  mainSymbol: KeshoSymbol;
  secondarySymbol?: KeshoSymbol;
  tertiarySymbol?: KeshoSymbol;

  // Sponsor information (if corporate origin)
  sponsorInfo?: {
    name: string;
    industry: string;
    logoStyle: "text" | "emblem" | "abstract";
  };

  // Legacy connection
  inspiredByOyakataId?: Id;
  inspiredByFormerShikona?: string;
  heyaBrandId: Id;

  // Generation metadata
  createdAt: { year: number; basho: string };
  updatedAt?: { year: number; basho: string }; // Upgraded on rank promotion

  // Display metadata
  description?: string; // Generated description for UI
}

/** Yokozuna tsuna (rope belt) for ceremonial dohyo-iri */
export interface YokozunaTsuna {
  rikishiId: Id;

  // Conferral information
  conferredAt: { year: number; basho: string };
  retiredAt?: { year: number; basho: string };

  // Style variants
  style: "shiranui" | "unryu" | "traditional";
  ropeColor: "white" | "gold_accented" | "silver_accented";
  paperTassels: number; // Typically 5-7

  // Display flags
  displayedOnProfile: boolean;
  isRetired: boolean;
}

/** Design palette used during procedural generation */
export interface MawashiDesignPalette {
  heyaBrand: HeyaBrandIdentity;
  rikishiNationality: string;
  rikishiOrigin?: string;
  oyakataFormerShikona?: string;
  oyakataHighestRank?: string;
  rank: Rank;
  division: Division;
}

/** Configuration for kesho-mawashi generation weights */
export interface KeshoGenerationWeights {
  // By nationality
  japanese: {
    traditional: number;
    corporate: number;
    heyaLegacy: number;
    national: number;
  };
  mongolian: {
    traditional: number;
    corporate: number;
    heyaLegacy: number;
    national: number;
  };
  otherForeign: {
    traditional: number;
    corporate: number;
    heyaLegacy: number;
    national: number;
  };
}

/** Default generation weights based on real sumo patterns */
export const DEFAULT_KESHO_WEIGHTS: KeshoGenerationWeights = {
  japanese: {
    traditional: 0.4,
    corporate: 0.35,
    heyaLegacy: 0.25,
    national: 0,
  },
  mongolian: {
    traditional: 0.3,
    corporate: 0.2,
    heyaLegacy: 0.2,
    national: 0.5,
  },
  otherForeign: {
    traditional: 0.35,
    corporate: 0.25,
    heyaLegacy: 0.2,
    national: 0.4,
  },
};

/** Tier thresholds for kesho-mawashi promotion */
export const KESHO_TIER_THRESHOLDS: Record<KeshoTier, { minRank: Rank; goldDensity: number }> = {
  juryo: { minRank: "juryo", goldDensity: 0.3 },
  makuuchi: { minRank: "maegashira", goldDensity: 0.5 },
  sanyaku: { minRank: "komusubi", goldDensity: 0.7 },
  yokozuna: { minRank: "yokozuna", goldDensity: 0.9 },
};

/** Color palettes for national flag themes (simplified for procedural generation) */
export const NATIONAL_FLAG_PALETTES: Record<
  string,
  { primary: string; secondary: string; accent: string; symbol?: string }
> = {
  Japan: { primary: "#BC002D", secondary: "#FFFFFF", accent: "#FFD700" },
  Mongolia: { primary: "#0066CC", secondary: "#CC0000", accent: "#FFD700", symbol: "soyombo" },
  Georgia: { primary: "#FFFFFF", secondary: "#CC0000", accent: "#FFD700", symbol: "crosses" },
  Russia: { primary: "#FFFFFF", secondary: "#0033A0", accent: "#CC0000" },
  Bulgaria: { primary: "#FFFFFF", secondary: "#00966E", accent: "#D62612" },
  Estonia: { primary: "#0072CE", secondary: "#000000", accent: "#FFFFFF" },
  Brazil: { primary: "#009739", secondary: "#FEDD00", accent: "#012169" },
  Hawaii: { primary: "#FFFFFF", secondary: "#FF0000", accent: "#0000FF", symbol: "rainbow" },
};

/** Traditional motif color associations */
export const MOTIF_COLOR_ASSOCIATIONS: Record<
  TraditionalMotif,
  { primary: string; secondary: string }
> = {
  dragon: { primary: "#8B0000", secondary: "#FFD700" },
  phoenix: { primary: "#FF4500", secondary: "#FFD700" },
  tiger: { primary: "#FF8C00", secondary: "#000000" },
  mt_fuji: { primary: "#4A6741", secondary: "#FFFFFF" },
  waves: { primary: "#1E3A5F", secondary: "#FFFFFF" },
  sakura: { primary: "#FFB7C5", secondary: "#FFFFFF" },
  pine: { primary: "#2F4F2F", secondary: "#8B7355" },
  bamboo: { primary: "#228B22", secondary: "#F5F5DC" },
  crane: { primary: "#FFFFFF", secondary: "#FF0000" },
  rising_sun: { primary: "#BC002D", secondary: "#FFFFFF" },
  lightning: { primary: "#4B0082", secondary: "#FFD700" },
  waterfall: { primary: "#4682B4", secondary: "#FFFFFF" },
  temple: { primary: "#8B4513", secondary: "#FFD700" },
  treasure_ship: { primary: "#8B0000", secondary: "#FFD700" },
  carp: { primary: "#FF6347", secondary: "#FFD700" },
  lotus: { primary: "#FF69B4", secondary: "#228B22" },
  thunder: { primary: "#4A0080", secondary: "#C0C0C0" },
  wind: { primary: "#87CEEB", secondary: "#FFFFFF" },
  // Extended motifs
  mountain: { primary: "#556B2F", secondary: "#FFFFFF" },
  ship: { primary: "#FFFFFF", secondary: "#1E3A5F" },
  whirlpool: { primary: "#4682B4", secondary: "#FFFFFF" },
  storm: { primary: "#4A4A4A", secondary: "#87CEEB" },
  sunrise: { primary: "#FF8C00", secondary: "#FFD700" },
  river: { primary: "#4682B4", secondary: "#87CEEB" },
  flower: { primary: "#FF69B4", secondary: "#FFB7C5" },
  butterfly: { primary: "#FF6347", secondary: "#FFD700" },
  echo: { primary: "#708090", secondary: "#C0C0C0" },
  sky: { primary: "#87CEEB", secondary: "#FFFFFF" },
  snow: { primary: "#FFFFFF", secondary: "#B0C4DE" },
  twin: { primary: "#4169E1", secondary: "#FFD700" },
  cloud: { primary: "#FFFFFF", secondary: "#87CEEB" },
  wisteria: { primary: "#9370DB", secondary: "#E6E6FA" },
  moon: { primary: "#F5F5DC", secondary: "#4A4A4A" },
  autumn: { primary: "#D2691E", secondary: "#FFD700" },
  fence: { primary: "#8B4513", secondary: "#D2691E" },
  poetry: { primary: "#4A0080", secondary: "#FFD700" },
  new_year: { primary: "#CC0000", secondary: "#FFD700" },
  bay: { primary: "#4682B4", secondary: "#87CEEB" },
  harbor: { primary: "#1E3A5F", secondary: "#FFD700" },
  moist: { primary: "#556B2F", secondary: "#87CEEB" },
  mist: { primary: "#B0C4DE", secondary: "#F5F5F5" },
  mirror: { primary: "#C0C0C0", secondary: "#87CEEB" },
  lake: { primary: "#4682B4", secondary: "#B0C4DE" },
  basket: { primary: "#8B4513", secondary: "#D2691E" },
  wheel: { primary: "#2F4F4F", secondary: "#C0C0C0" },
  cart: { primary: "#8B4513", secondary: "#D2691E" },
};

/** Industry categories for corporate sponsors with color palettes */
export const CORPORATE_INDUSTRY_PALETTES: Record<
  string,
  { primary: string; secondary: string; accent: string; typicalSymbols: string[] }
> = {
  shipping: {
    primary: "#003366",
    secondary: "#FFFFFF",
    accent: "#CC0000",
    typicalSymbols: ["anchor", "ship", "wave"],
  },
  technology: {
    primary: "#00A8E8",
    secondary: "#FFFFFF",
    accent: "#FF6B6B",
    typicalSymbols: ["circuit", "chip", "network"],
  },
  finance: {
    primary: "#1A365D",
    secondary: "#F7FAFC",
    accent: "#D69E2E",
    typicalSymbols: ["building", "graph", "column"],
  },
  construction: {
    primary: "#FF6B35",
    secondary: "#FFFFFF",
    accent: "#2D3748",
    typicalSymbols: ["crane", "building", "helmet"],
  },
  food: {
    primary: "#E53E3E",
    secondary: "#FFF5F5",
    accent: "#48BB78",
    typicalSymbols: ["rice", "fish", "bowl"],
  },
  automotive: {
    primary: "#2D3748",
    secondary: "#E2E8F0",
    accent: "#ED8936",
    typicalSymbols: ["wheel", "speed", "road"],
  },
  energy: {
    primary: "#FF8C00",
    secondary: "#FFFFFF",
    accent: "#FFD700",
    typicalSymbols: ["sun", "bolt", "tower"],
  },
  retail: {
    primary: "#9F7AEA",
    secondary: "#FFFFFF",
    accent: "#F6E05E",
    typicalSymbols: ["bag", "tag", "store"],
  },
};
