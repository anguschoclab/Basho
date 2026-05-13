// oyakataStylePreferences.ts — Oyakata recruitment & management style biases
// Some owners favor specific wrestling styles, some chase the meta, some are stubborn traditionalists

import type { WorldState } from "./types/world";
import type { Oyakata, OyakataArchetype } from "./types/oyakata";
import type { CombatArchetype, Style, CombatProfile } from "./types/combat";
import { rngForWorld } from "./rng";

/** Type representing recruitment philosophy. */
export type RecruitmentPhilosophy =
  | "style_purist" // Only recruits wrestlers matching their preferred style
  | "meta_chaser" // Adapts recruitment to whatever style won last yusho
  | "traditionalist" // Favors yotsu/belt-wrestling regardless of meta
  | "innovator" // Prefers speedsters and tricksters
  | "size_matters" // Prioritizes physical stats over technique
  | "balanced" // No strong preference
  | "underdog_hunter"; // Seeks hidden gems and overlooked talent

/** Defines the structure for oyakata style profile. */
export interface OyakataStyleProfile {
  philosophy: RecruitmentPhilosophy;
  preferredArchetypes: CombatArchetype[];
  preferredStyle: Style | "any";
  /** Weight bias for recruit stats. Higher = more important */
  statWeights: {
    power: number;
    speed: number;
    technique: number;
    size: number;
    potential: number;
  };
  description: string;
}

const PHILOSOPHY_BY_ARCHETYPE: Record<OyakataArchetype, RecruitmentPhilosophy[]> = {
  traditionalist: ["traditionalist", "style_purist"],
  scientist: ["meta_chaser", "innovator", "balanced"],
  gambler: ["underdog_hunter", "meta_chaser"],
  nurturer: ["balanced", "underdog_hunter"],
  tyrant: ["size_matters", "style_purist"],
  strategist: ["meta_chaser", "balanced", "innovator"],
  strict: ["style_purist", "traditionalist"],
  indulgent: ["balanced", "underdog_hunter"],
};

/**
 * Get oyakata style profile.
 */
export function getOyakataStyleProfile(world: WorldState, oyakata: Oyakata): OyakataStyleProfile {
  const rng = rngForWorld(world, "oyakataStyle", oyakata.id);

  // Pick philosophy from archetype affinities
  const options = PHILOSOPHY_BY_ARCHETYPE[oyakata.archetype] ?? ["balanced"];
  const philosophy = options[rng.int(0, options.length - 1)];

  // Determine preferences based on philosophy
  const PHILOSOPHY_HANDLERS: Record<RecruitmentPhilosophy, () => OyakataStyleProfile> = {
    style_purist: () => {
      const styleBias = (oyakata.traits?.tradition ?? 50) >= 60 ? "yotsu" : "oshi";
      return {
        philosophy: "style_purist",
        preferredArchetypes: styleBias === "yotsu" ? ["yotsu"] : ["oshi", "tsuppari"],
        preferredStyle: styleBias as Style,
        statWeights: { power: 0.7, speed: 0.4, technique: 0.9, size: 0.5, potential: 0.6 },
        description: `Exclusively recruits ${styleBias} wrestlers. Refuses to train other styles.`,
      };
    },
    meta_chaser: () => {
      const meta = world._postBashoMeta;
      const metaStyle =
        meta?.metaBias === "oshi" ? "oshi" : meta?.metaBias === "yotsu" ? "yotsu" : "hybrid";
      return {
        philosophy: "meta_chaser",
        preferredArchetypes:
          metaStyle === "oshi"
            ? ["oshi", "speedster"]
            : metaStyle === "yotsu"
              ? ["yotsu"]
              : ["hybrid"],
        preferredStyle: metaStyle as Style,
        statWeights: { power: 0.6, speed: 0.6, technique: 0.6, size: 0.5, potential: 0.8 },
        description: `Adapts recruitment to the current dominant style. Currently favoring ${metaStyle}.`,
      };
    },
    traditionalist: () => ({
      philosophy: "traditionalist",
      preferredArchetypes: ["yotsu", "hybrid"],
      preferredStyle: "yotsu",
      statWeights: { power: 0.8, speed: 0.3, technique: 0.7, size: 0.8, potential: 0.5 },
      description: "Old school. Believes in belt-wrestling, heavy training, and traditional methods.",
    }),
    innovator: () => ({
      philosophy: "innovator",
      preferredArchetypes: ["speedster", "trickster", "defensive"],
      preferredStyle: "any",
      statWeights: { power: 0.3, speed: 0.9, technique: 0.8, size: 0.2, potential: 0.9 },
      description: "Seeks unconventional wrestlers who can outthink and outmaneuver opponents.",
    }),
    size_matters: () => ({
      philosophy: "size_matters",
      preferredArchetypes: ["oshi", "hybrid", "giant"],
      preferredStyle: "oshi",
      statWeights: { power: 0.9, speed: 0.2, technique: 0.4, size: 1.0, potential: 0.5 },
      description: "Recruits the biggest, heaviest prospects. Believes mass wins matches.",
    }),
    underdog_hunter: () => ({
      philosophy: "underdog_hunter",
      preferredArchetypes: ["trickster", "speedster"],
      preferredStyle: "any",
      statWeights: { power: 0.4, speed: 0.5, technique: 0.5, size: 0.3, potential: 1.0 },
      description: "Scouts overlooked talent from obscure sources. Values raw potential over polish.",
    }),
    balanced: () => ({
      philosophy: "balanced",
      preferredArchetypes: ["hybrid"],
      preferredStyle: "any",
      statWeights: { power: 0.6, speed: 0.6, technique: 0.6, size: 0.5, potential: 0.7 },
      description: "No strong recruitment bias. Evaluates each prospect on individual merit.",
    }),
  };

  return (PHILOSOPHY_HANDLERS[philosophy] || PHILOSOPHY_HANDLERS.balanced)();
}

/** Score a candidate for a given oyakata's preferences (0-100) */
export function scoreRecruitForOyakata(
  world: WorldState,
  oyakata: Oyakata,
  candidate: {
    archetype: CombatArchetype;
    style: Style;
    talentSeed: number;
    weightPotentialKg: number;
    combatProfile?: CombatProfile;
  }
): number {
  const profile = getOyakataStyleProfile(world, oyakata);
  let score = 50;

  // Archetype match bonus
  if (profile.preferredArchetypes.includes(candidate.archetype)) score += 25;

  // Style match
  if (profile.preferredStyle !== "any" && candidate.style === profile.preferredStyle) score += 15;
  if (profile.preferredStyle !== "any" && candidate.style !== profile.preferredStyle) score -= 10;

  // Stat weights
  score += (candidate.talentSeed || 50) * profile.statWeights.potential * 0.2;
  score += (candidate.weightPotentialKg > 130 ? 10 : 0) * profile.statWeights.size;

  // Meta Shift: Combat Profile preferences
  if (candidate.combatProfile) {
    const fam = candidate.combatProfile.familyPreferences;
    if (profile.philosophy === "innovator") {
      score += (fam.trick || 0) * 0.15;
      score += (fam.speed || 0) * 0.1;
    } else if (profile.philosophy === "traditionalist" || profile.philosophy === "size_matters") {
      score += (fam.belt || 0) * 0.15;
    } else if (profile.philosophy === "style_purist") {
      if (profile.preferredStyle === "oshi") score += (fam.push || 0) * 0.15;
      else if (profile.preferredStyle === "yotsu") score += (fam.belt || 0) * 0.15;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
