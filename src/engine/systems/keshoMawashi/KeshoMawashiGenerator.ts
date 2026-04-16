/**
 * Kesho-Mawashi Generator
 *
 * Generates ceremonial aprons for sekitori (juryo and makuuchi wrestlers).
 * Designs are influenced by heya brand identity, nationality, and rank tier.
 */

import type { Rikishi } from "../../types/rikishi";
import type { WorldState } from "../../types/world";
import type { MovementEvent } from "../../types/banzuke";
import type {
  KeshoMawashi,
  KeshoTier,
  DesignOrigin,
  TraditionalMotif,
  BasePattern,
  KeshoSymbol,
  SymbolPosition,
  BorderStyle,
  EmbroideryStyle,
  HeyaBrandIdentity,
  MawashiDesignPalette,
  YokozunaTsuna,
  Season,
} from "../../types/keshoMawashi";
import { getSeasonFromBasho, SEASONAL_PALETTES, SEASONAL_MOTIFS } from "../../types/keshoMawashi";
import {
  DEFAULT_KESHO_WEIGHTS,
  NATIONAL_FLAG_PALETTES,
  MOTIF_COLOR_ASSOCIATIONS,
  CORPORATE_INDUSTRY_PALETTES,
} from "../../types/keshoMawashi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { rngFromSeed } from "../../rng";
import type { SeededRNG } from "../../rng";

/** Generate kesho-mawashi for all promotions detected in banzuke update */
export function generateKeshoForPromotions(
  world: WorldState,
  events: MovementEvent[]
): StateImpact {
  const builder = createImpactBuilder("keshoGeneration");

  for (const event of events) {
    if (event.kind !== "promotion") continue;

    const rikishi = world.rikishi.get(event.rikishiId);
    if (!rikishi) continue;

    // Check if this is a makushita -> juryo promotion (first sekitori rank)
    const isJuryoPromotion = event.from.includes("makushita") && event.to.includes("juryo");

    // Check if this is a juryo -> makuuchi promotion (tier upgrade)
    // Makuuchi division ranks: maegashira, sekiwake, komusubi, ozeki, yokozuna
    const isMakuuchiPromotion =
      event.from.includes("juryo") &&
      (event.to.includes("maegashira") ||
        event.to.includes("sekiwake") ||
        event.to.includes("komusubi") ||
        event.to.includes("ozeki") ||
        event.to.includes("yokozuna"));

    // Check if this is a sanyaku promotion (ranks: sekiwake, komusubi, ozeki, yokozuna)
    const isSanyakuPromotion =
      (event.from.includes("maegashira") || event.from.includes("juryo")) &&
      (event.to.includes("sekiwake") ||
        event.to.includes("komusubi") ||
        event.to.includes("ozeki") ||
        event.to.includes("yokozuna"));

    if (isJuryoPromotion && !rikishi.keshoMawashi) {
      // Generate new kesho-mawashi for first-time sekitori
      const kesho = generateKeshoMawashi(world, rikishi, "juryo");
      builder.updateRikishi(rikishi.id, { keshoMawashi: kesho });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (builder as any).logEvent?.(
        "KESHO_CREATED",
        "narrative",
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          tier: "juryo",
          description: `${rikishi.shikona} receives their first kesho-mawashi upon juryo promotion.`,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    } else if ((isMakuuchiPromotion || isSanyakuPromotion) && rikishi.keshoMawashi) {
      // Upgrade existing kesho-mawashi
      const newTier: KeshoTier = isSanyakuPromotion
        ? event.to.includes("yokozuna")
          ? "yokozuna"
          : "sanyaku"
        : "makuuchi";

      const upgraded = upgradeKeshoMawashi(rikishi.keshoMawashi, newTier, world);
      builder.updateRikishi(rikishi.id, { keshoMawashi: upgraded });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (builder as any).logEvent?.(
        "KESHO_UPGRADED",
        "narrative",
        {
          rikishiId: rikishi.id,
          heyaId: rikishi.heyaId,
          oldTier: rikishi.keshoMawashi?.tier,
          newTier,
          description: `${rikishi.shikona}'s kesho-mawashi is upgraded to ${newTier} tier.`,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    }

    // Generate yokozuna tsuna for yokozuna promotion
    if (event.to.includes("yokozuna") && !rikishi.yokozunaTsuna) {
      const tsuna = generateYokozunaTsuna(world, rikishi);
      builder.updateRikishi(rikishi.id, { yokozunaTsuna: tsuna });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (builder as any).logEvent?.(
        "YOKOZUNA_TSUNA_CREATED",
        "narrative",
        {
          rikishiId: rikishi.id,
          style: tsuna.style,
          description: `${rikishi.shikona} receives the yokozuna tsuna.`,
        },
        { rikishiId: rikishi.id }
      );
    }

    // Generate yokozuna-tier kesho for direct yokozuna promotions (if no kesho exists)
    if (event.to.includes("yokozuna") && !rikishi.keshoMawashi) {
      const kesho = generateKeshoMawashi(world, rikishi, "yokozuna");
      builder.updateRikishi(rikishi.id, { keshoMawashi: kesho });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (builder as any).logEvent?.(
        "KESHO_MAWASHI_CREATED",
        "narrative",
        {
          rikishiId: rikishi.id,
          tier: "yokozuna",
          description: `${rikishi.shikona} receives a magnificent yokozuna-tier kesho-mawashi.`,
        },
        { rikishiId: rikishi.id, heyaId: rikishi.heyaId }
      );
    }
  }

  return builder.build();
}

/** Generate a new kesho-mawashi for a rikishi */
export function generateKeshoMawashi(
  world: WorldState,
  rikishi: Rikishi,
  tier: KeshoTier
): KeshoMawashi {
  const seedPrefix = `${world.seed}::kesho::${rikishi.id}::${tier}`;
  const rng = rngFromSeed(seedPrefix, "kesho", rikishi.id);

  const palette = buildDesignPalette(world, rikishi);
  const origin = selectDesignOrigin(palette, rng);

  // Generate colors based on origin
  const colors = generateColors(origin, palette, rng);

  // Apply seasonal influence
  const season = getSeasonFromBasho(world.currentBashoName || "hatsu");
  const seasonalColors = applySeasonalColorInfluence(colors, season, rng);

  // Generate pattern
  const basePattern = selectBasePattern(tier, rng);

  // Generate border style
  const borderStyle = selectBorderStyle(tier, rng);

  // Generate embroidery style
  const embroideryStyle = selectEmbroideryStyle(tier, rng);

  // Generate symbols with seasonal influence
  const mainSymbol = generateMainSymbol(origin, palette, rng);
  const seasonalMainSymbol = {
    ...mainSymbol,
    value: applySeasonalMotifInfluence(mainSymbol.value as TraditionalMotif, season, rng),
  };
  const secondarySymbol =
    rng.next() < 0.6 ? generateSecondarySymbol(origin, palette, rng) : undefined;
  const seasonalSecondarySymbol = secondarySymbol
    ? {
        ...secondarySymbol,
        value: applySeasonalMotifInfluence(secondarySymbol.value as TraditionalMotif, season, rng),
      }
    : undefined;
  const tertiarySymbol =
    tier === "yokozuna" || tier === "sanyaku"
      ? rng.next() < 0.4
        ? generateSecondarySymbol(origin, palette, rng)
        : undefined
      : undefined;
  const seasonalTertiarySymbol = tertiarySymbol
    ? {
        ...tertiarySymbol,
        value: applySeasonalMotifInfluence(tertiarySymbol.value as TraditionalMotif, season, rng),
      }
    : undefined;

  // Calculate gold thread density based on tier
  const goldDensity = calculateGoldDensity(tier, rng);

  // Build sponsor info if corporate origin
  const sponsorInfo = origin === "corporate" ? generateSponsorInfo(palette, rng) : undefined;

  // Get legacy connections
  const heya = world.heyas.get(rikishi.heyaId);
  const oyakata = heya ? world.oyakata.get(heya.oyakataId) : undefined;

  return {
    id: rng.uuid("KM"),
    rikishiId: rikishi.id,
    tier,
    origin,
    basePattern,
    primaryColor: seasonalColors.primary,
    secondaryColor: seasonalColors.secondary,
    accentColor: seasonalColors.accent,
    goldThreadDensity: goldDensity,
    borderStyle,
    embroideryStyle,
    mainSymbol: seasonalMainSymbol,
    secondarySymbol: seasonalSecondarySymbol,
    tertiarySymbol: seasonalTertiarySymbol,
    sponsorInfo,
    inspiredByOyakataId: oyakata?.id,
    inspiredByFormerShikona: oyakata?.formerShikona,
    heyaBrandId: heya?.brandIdentityId || "",
    createdAt: { year: world.year, basho: world.currentBashoName || "unknown" },
    description: generateDescription(tier, origin, seasonalMainSymbol, palette),
  };
}

/** Upgrade an existing kesho-mawashi to a higher tier */
export function upgradeKeshoMawashi(
  mawashi: KeshoMawashi,
  newTier: KeshoTier,
  world: WorldState
): KeshoMawashi {
  const seedPrefix = `${world.seed}::kesho_upgrade::${mawashi.rikishiId}::${newTier}`;
  const rng = rngFromSeed(seedPrefix, "kesho_upgrade", mawashi.rikishiId);

  // Increase gold thread density
  const newGoldDensity = calculateGoldDensity(newTier, rng);

  // May add tertiary symbol for higher tiers
  const rikishi = world.rikishi.get(mawashi.rikishiId);
  const newTertiary =
    newTier === "sanyaku" || newTier === "yokozuna"
      ? mawashi.tertiarySymbol ||
        (rng.next() < 0.5 && rikishi
          ? generateSecondarySymbol(mawashi.origin, buildDesignPalette(world, rikishi), rng)
          : undefined)
      : mawashi.tertiarySymbol;

  return {
    ...mawashi,
    tier: newTier,
    goldThreadDensity: Math.max(mawashi.goldThreadDensity, newGoldDensity),
    tertiarySymbol: newTertiary,
    updatedAt: { year: world.year, basho: world.currentBashoName || "unknown" },
    description: `${mawashi.description} (Upgraded to ${newTier} tier)`,
  };
}

/** Build the design palette for generation */
function buildDesignPalette(world: WorldState, rikishi: Rikishi): MawashiDesignPalette {
  const heya = world.heyas.get(rikishi.heyaId);
  const oyakata = heya ? world.oyakata.get(heya.oyakataId) : undefined;

  // Get heya brand from world state or create default
  const brandId = heya?.brandIdentityId;
  const brandMap = world.heyaBrandIdentities;
  const brand = brandId && brandMap?.get(brandId);

  // Create default brand if not found
  const heyaBrand: HeyaBrandIdentity = brand || {
    id: `default-${heya?.id || "unknown"}`,
    heyaId: heya?.id || "unknown",
    primaryColor: "#1E3A5F",
    secondaryColor: "#FFFFFF",
    accentColor: "#FFD700",
    crestMotif: "dragon",
    crestStyle: "circular",
    traditionLevel: 0.5,
    createdAt: { year: 2025, basho: "hatsu" },
  };

  return {
    heyaBrand,
    rikishiNationality: rikishi.nationality,
    rikishiOrigin: rikishi.origin,
    oyakataFormerShikona: oyakata?.formerShikona,
    oyakataHighestRank: oyakata?.highestRank,
    rank: rikishi.rank,
    division: rikishi.division,
  };
}

/** Select the design origin based on nationality and weights */
function selectDesignOrigin(palette: MawashiDesignPalette, rng: SeededRNG): DesignOrigin {
  const nationality = palette.rikishiNationality;

  // Get weights based on nationality
  let weights: { traditional: number; corporate: number; heyaLegacy: number; national: number };

  if (nationality === "Japan") {
    weights = DEFAULT_KESHO_WEIGHTS.japanese;
  } else if (nationality === "Mongolia") {
    weights = DEFAULT_KESHO_WEIGHTS.mongolian;
  } else {
    weights = DEFAULT_KESHO_WEIGHTS.otherForeign;
  }

  // Adjust for oyakata tradition level (higher = more heya legacy chance)
  if (palette.heyaBrand.traditionLevel > 0.7) {
    weights.heyaLegacy += 0.15;
    weights.traditional -= 0.05;
    weights.corporate -= 0.05;
    weights.national -= 0.05;
  }

  // Normalize weights
  const total = weights.traditional + weights.corporate + weights.heyaLegacy + weights.national;
  const roll = rng.next() * total;

  if (roll < weights.national) return "national";
  if (roll < weights.national + weights.heyaLegacy) return "heya_legacy";
  if (roll < weights.national + weights.heyaLegacy + weights.traditional) return "traditional";
  return "corporate";
}

/** Generate colors based on origin and palette */
function generateColors(
  origin: DesignOrigin,
  palette: MawashiDesignPalette,
  rng: SeededRNG
): { primary: string; secondary: string; accent: string } {
  const brand = palette.heyaBrand;

  switch (origin) {
    case "national": {
      const flagColors = NATIONAL_FLAG_PALETTES[palette.rikishiNationality];
      if (flagColors) {
        return {
          primary: flagColors.primary,
          secondary: flagColors.secondary,
          accent: flagColors.accent,
        };
      }
      // Fallback to heya brand
      return {
        primary: brand.primaryColor,
        secondary: brand.secondaryColor,
        accent: brand.accentColor,
      };
    }

    case "heya_legacy":
      return {
        primary: brand.primaryColor,
        secondary: brand.secondaryColor,
        accent: brand.accentColor,
      };

    case "traditional": {
      // Pick a random motif and use its colors
      const motifs = Object.keys(MOTIF_COLOR_ASSOCIATIONS) as TraditionalMotif[];
      const motif = rng.pick(motifs);
      const motifColors = MOTIF_COLOR_ASSOCIATIONS[motif];
      return {
        primary: motifColors.primary,
        secondary: motifColors.secondary,
        accent: brand.accentColor,
      };
    }

    case "corporate": {
      const industries = Object.keys(CORPORATE_INDUSTRY_PALETTES);
      const industry = rng.pick(industries);
      const corpColors = CORPORATE_INDUSTRY_PALETTES[industry];
      return {
        primary: corpColors.primary,
        secondary: corpColors.secondary,
        accent: corpColors.accent,
      };
    }

    default:
      return {
        primary: brand.primaryColor,
        secondary: brand.secondaryColor,
        accent: brand.accentColor,
      };
  }
}

/** Select base pattern based on tier */
function selectBasePattern(tier: KeshoTier, rng: SeededRNG): BasePattern {
  const patterns: BasePattern[] = [
    "solid",
    "striped",
    "gradient",
    "cloud",
    "ray",
    "checkered",
    "waves",
    "scales",
    "geometric",
    "dragon",
    "phoenix",
    "floral",
    "tribal",
    "lattice",
    "hexagonal",
    "damask",
    "ikat",
    "plaid",
    "chevron",
    "paisley",
  ];

  // Higher tiers get more elaborate patterns
  const weights: Record<KeshoTier, number[]> = {
    juryo: [
      0.3, 0.2, 0.15, 0.05, 0.05, 0, 0.05, 0.04, 0.02, 0.01, 0.01, 0.04, 0.03, 0.02, 0.01, 0.01,
      0.01, 0, 0, 0,
    ],
    makuuchi: [
      0.1, 0.15, 0.15, 0.1, 0.07, 0.04, 0.07, 0.05, 0.04, 0.03, 0.03, 0.06, 0.05, 0.04, 0.03, 0.02,
      0.02, 0.02, 0.01, 0.01,
    ],
    sanyaku: [
      0.05, 0.1, 0.12, 0.12, 0.1, 0.07, 0.09, 0.07, 0.05, 0.04, 0.03, 0.07, 0.06, 0.05, 0.04, 0.03,
      0.02, 0.02, 0.01, 0.01,
    ],
    yokozuna: [
      0.02, 0.05, 0.1, 0.12, 0.12, 0.08, 0.1, 0.08, 0.06, 0.05, 0.04, 0.08, 0.07, 0.06, 0.05, 0.04,
      0.03, 0.02, 0.01, 0.01,
    ],
  };

  const tierWeights = weights[tier];
  const roll = rng.next();
  let cumulative = 0;

  for (let i = 0; i < patterns.length; i++) {
    cumulative += tierWeights[i];
    if (roll < cumulative) return patterns[i];
  }

  return "solid";
}

/** Select border style based on tier */
function selectBorderStyle(tier: KeshoTier, rng: SeededRNG): BorderStyle {
  const styles: BorderStyle[] = ["simple", "double", "ornate", "rope", "scalloped"];

  // Higher tiers get more elaborate borders
  const weights: Record<KeshoTier, number[]> = {
    juryo: [0.7, 0.2, 0.05, 0.03, 0.02],
    makuuchi: [0.5, 0.25, 0.12, 0.08, 0.05],
    sanyaku: [0.3, 0.25, 0.2, 0.15, 0.1],
    yokozuna: [0.2, 0.2, 0.25, 0.2, 0.15],
  };

  const tierWeights = weights[tier];
  const roll = rng.next();
  let cumulative = 0;

  for (let i = 0; i < styles.length; i++) {
    cumulative += tierWeights[i];
    if (roll < cumulative) return styles[i];
  }

  return "simple";
}

/** Select embroidery style based on tier */
function selectEmbroideryStyle(tier: KeshoTier, rng: SeededRNG): EmbroideryStyle {
  const styles: EmbroideryStyle[] = ["satin", "chain", "couching", "goldwork"];

  // Higher tiers get more elaborate embroidery
  const weights: Record<KeshoTier, number[]> = {
    juryo: [0.7, 0.2, 0.07, 0.03],
    makuuchi: [0.5, 0.3, 0.13, 0.07],
    sanyaku: [0.3, 0.3, 0.25, 0.15],
    yokozuna: [0.2, 0.25, 0.3, 0.25],
  };

  const tierWeights = weights[tier];
  const roll = rng.next();
  let cumulative = 0;

  for (let i = 0; i < styles.length; i++) {
    cumulative += tierWeights[i];
    if (roll < cumulative) return styles[i];
  }

  return "satin";
}

/** Apply seasonal influence to color selection */
function applySeasonalColorInfluence(
  colors: { primary: string; secondary: string; accent: string },
  season: Season,
  rng: SeededRNG
): { primary: string; secondary: string; accent: string } {
  // 30% chance to use seasonal color for primary or secondary
  if (rng.next() < 0.3) {
    const seasonalColors = SEASONAL_PALETTES[season];
    const seasonalColor = rng.pick(seasonalColors);
    if (rng.next() < 0.5) {
      return { ...colors, primary: seasonalColor };
    } else {
      return { ...colors, secondary: seasonalColor };
    }
  }
  return colors;
}

/** Apply seasonal influence to motif selection */
function applySeasonalMotifInfluence(
  motif: TraditionalMotif,
  season: Season,
  rng: SeededRNG
): TraditionalMotif {
  // 25% chance to use seasonal motif
  if (rng.next() < 0.25) {
    const seasonalMotifs = SEASONAL_MOTIFS[season];
    return rng.pick(seasonalMotifs);
  }
  return motif;
}

/** Generate the main symbol for the mawashi */
function generateMainSymbol(
  origin: DesignOrigin,
  palette: MawashiDesignPalette,
  rng: SeededRNG
): KeshoSymbol {
  const brand = palette.heyaBrand;

  switch (origin) {
    case "national":
      return {
        type: "national_flag",
        value: palette.rikishiNationality,
        position: "center",
        size: "large",
        prominence: 0.9,
      };

    case "heya_legacy":
      return {
        type: "heya_crest",
        value: brand.crestMotif,
        position: "center",
        size: "large",
        prominence: 0.85,
      };

    case "traditional": {
      const motifs = Object.keys(MOTIF_COLOR_ASSOCIATIONS) as TraditionalMotif[];
      const motif = rng.pick(motifs);
      return {
        type: "motif",
        value: motif,
        position: "center",
        size: "large",
        prominence: 0.8,
      };
    }

    case "corporate": {
      const industries = Object.keys(CORPORATE_INDUSTRY_PALETTES);
      const industry = rng.pick(industries);
      return {
        type: "corporate_logo",
        value: industry,
        position: "center",
        size: "medium",
        prominence: 0.7,
      };
    }

    default:
      return {
        type: "motif",
        value: "dragon",
        position: "center",
        size: "large",
        prominence: 0.8,
      };
  }
}

/** Generate a secondary symbol */
function generateSecondarySymbol(
  _origin: DesignOrigin,
  palette: MawashiDesignPalette,
  rng: SeededRNG
): KeshoSymbol {
  const brand = palette.heyaBrand;
  const positions: SymbolPosition[] = ["left", "right", "upper", "lower", "scattered"];

  // 50% chance to use heya crest as secondary
  if (rng.next() < 0.5) {
    return {
      type: "heya_crest",
      value: brand.crestMotif,
      position: rng.pick(positions),
      size: rng.next() < 0.5 ? "small" : "medium",
      prominence: 0.4,
    };
  }

  // 30% chance for personal seal
  if (rng.next() < 0.3) {
    return {
      type: "personal_seal",
      value: "seal",
      position: rng.pick(positions),
      size: "small",
      prominence: 0.3,
    };
  }

  // Otherwise use a complementary motif
  const motifs = Object.keys(MOTIF_COLOR_ASSOCIATIONS) as TraditionalMotif[];
  return {
    type: "motif",
    value: rng.pick(motifs),
    position: rng.pick(positions),
    size: "small",
    prominence: 0.35,
  };
}

/** Calculate gold thread density based on tier */
function calculateGoldDensity(tier: KeshoTier, rng: SeededRNG): number {
  const baseDensities: Record<KeshoTier, number> = {
    juryo: 0.3,
    makuuchi: 0.5,
    sanyaku: 0.7,
    yokozuna: 0.9,
  };

  const base = baseDensities[tier];
  const variance = rng.next() * 0.1 - 0.05; // +/- 5%
  return Math.min(1, Math.max(0, base + variance));
}

/** Generate sponsor info for corporate designs */
function generateSponsorInfo(
  _palette: MawashiDesignPalette,
  rng: SeededRNG
): { name: string; industry: string; logoStyle: "text" | "emblem" | "abstract" } {
  const industries = Object.keys(CORPORATE_INDUSTRY_PALETTES);
  const industry = rng.pick(industries);

  const companyPrefixes = [
    "Nippon",
    "Tokyo",
    "Sumo",
    "East",
    "West",
    "Imperial",
    "Royal",
    "Golden",
  ];
  const companySuffixes: Record<string, string[]> = {
    shipping: ["Kaiun", "Unyu", "Senpaku", "Lines"],
    technology: ["Tech", "Systems", "Digital", "Solutions"],
    finance: ["Bank", "Securities", "Trust", "Finance"],
    construction: ["Kensetsu", "Construction", "Build", "Engineering"],
    food: ["Shokuhin", "Foods", "Dining", "Cuisine"],
    automotive: ["Jidosha", "Motors", "Auto", "Cars"],
    energy: ["Enerugi", "Power", "Energy", "Electric"],
    retail: ["Shoten", "Mart", "Store", "Retail"],
  };

  const suffixes = companySuffixes[industry] || ["Co.", "Inc.", "Corp."];
  const prefix = rng.pick(companyPrefixes);
  const suffix = rng.pick(suffixes);
  const name = `${prefix} ${suffix}`;

  const logoStyles: Array<"text" | "emblem" | "abstract"> = ["text", "emblem", "abstract"];

  return {
    name,
    industry,
    logoStyle: rng.pick(logoStyles),
  };
}

/** Generate a description for the kesho-mawashi */
function generateDescription(
  tier: KeshoTier,
  origin: DesignOrigin,
  mainSymbol: KeshoSymbol,
  _palette: MawashiDesignPalette
): string {
  // _palette is intentionally unused for now - kept for future use
  void _palette;
  const tierDescriptions: Record<KeshoTier, string> = {
    juryo: "An elegant ceremonial apron suitable for a rising sekitori",
    makuuchi: "A prestigious mawashi befitting a top-division wrestler",
    sanyaku: "An ornate ceremonial garment worthy of sanyaku rank",
    yokozuna: "A magnificent golden-threaded masterpiece fit for a grand champion",
  };

  const originDescriptions: Record<DesignOrigin, string> = {
    corporate: "featuring corporate sponsorship",
    traditional: "adorned with traditional Japanese motifs",
    national: "incorporating national heritage elements",
    heya_legacy: "bearing the proud tradition of the heya",
  };

  const symbolDescriptions: Record<string, string> = {
    dragon: "a powerful dragon",
    phoenix: "a majestic phoenix",
    tiger: "a fierce tiger",
    mt_fuji: "Mount Fuji",
    waves: "crashing waves",
    sakura: "cherry blossoms",
    pine: "evergreen pine",
    bamboo: "sturdy bamboo",
    crane: "a graceful crane",
    rising_sun: "the rising sun",
    lightning: "lightning bolts",
    waterfall: "a cascading waterfall",
    temple: "a traditional temple",
    treasure_ship: "the treasure ship",
    carp: "a noble carp",
    lotus: "a pure lotus",
    thunder: "thunder clouds",
    wind: "swirling winds",
  };

  const tierDesc = tierDescriptions[tier];
  const originDesc = originDescriptions[origin];
  const symbolDesc = symbolDescriptions[mainSymbol.value] || mainSymbol.value;

  return `${tierDesc}, ${originDesc}, with ${symbolDesc} as the central motif.`;
}

/** Generate a yokozuna tsuna */
export function generateYokozunaTsuna(world: WorldState, rikishi: Rikishi): YokozunaTsuna {
  const seedPrefix = `${world.seed}::tsuna::${rikishi.id}`;
  const rng = rngFromSeed(seedPrefix, "tsuna", rikishi.id);

  const styles: Array<"shiranui" | "unryu" | "traditional"> = ["shiranui", "unryu", "traditional"];
  const ropeColors: Array<"white" | "gold_accented" | "silver_accented"> = [
    "white",
    "gold_accented",
    "silver_accented",
  ];

  // Yokozuna get gold-accented more often
  const ropeColor = rng.next() < 0.7 ? "gold_accented" : rng.pick(ropeColors);

  return {
    rikishiId: rikishi.id,
    conferredAt: { year: world.year, basho: world.currentBashoName || "unknown" },
    style: rng.pick(styles),
    ropeColor,
    paperTassels: 5 + rng.int(0, 2), // 5-7 tassels
    displayedOnProfile: true,
    isRetired: false,
  };
}
