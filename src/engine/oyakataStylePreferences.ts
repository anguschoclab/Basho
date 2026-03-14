// oyakataStylePreferences.ts — Oyakata recruitment & management style biases
// Some owners favor specific wrestling styles, some chase the meta, some are stubborn traditionalists

import type { WorldState } from "./types/world";
import type { Oyakata, OyakataArchetype } from "./types/oyakata";
import type { TacticalArchetype, Style } from "./types/combat";
import type { Id } from "./types/common";
import { rngForWorld } from "./rng";

export type RecruitmentPhilosophy = 
  | "style_purist"      // Only recruits wrestlers matching their preferred style
  | "meta_chaser"       // Adapts recruitment to whatever style won last yusho
  | "traditionalist"    // Favors yotsu/belt-wrestling regardless of meta
  | "innovator"         // Prefers speedsters and tricksters
  | "size_matters"      // Prioritizes physical stats over technique
  | "balanced"          // No strong preference
  | "underdog_hunter";  // Seeks hidden gems and overlooked talent

export interface OyakataStyleProfile {
  philosophy: RecruitmentPhilosophy;
  preferredArchetypes: TacticalArchetype[];
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
};

export function getOyakataStyleProfile(world: WorldState, oyakata: Oyakata): OyakataStyleProfile {
  const rng = rngForWorld(world, "oyakataStyle", oyakata.id);
  
  // Pick philosophy from archetype affinities
  const options = PHILOSOPHY_BY_ARCHETYPE[oyakata.archetype] ?? ["balanced"];
  const philosophy = options[rng.int(0, options.length - 1)];
  
  // Determine preferences based on philosophy
  switch (philosophy) {
    case "style_purist": {
      const styleBias = oyakata.traits.tradition >= 60 ? "yotsu" : "oshi";
      return {
        philosophy,
        preferredArchetypes: styleBias === "yotsu" 
          ? ["yotsu_specialist", "counter_specialist"]
          : ["oshi_specialist", "hybrid_oshi_yotsu"],
        preferredStyle: styleBias as Style,
        statWeights: { power: 0.7, speed: 0.4, technique: 0.9, size: 0.5, potential: 0.6 },
        description: `Exclusively recruits ${styleBias} wrestlers. Refuses to train other styles.`,
      };
    }
    case "meta_chaser": {
      const meta = world._postBashoMeta;
      const metaStyle = meta?.metaBias === "oshi" ? "oshi" : meta?.metaBias === "yotsu" ? "yotsu" : "hybrid";
      return {
        philosophy,
        preferredArchetypes: metaStyle === "oshi" 
          ? ["oshi_specialist", "speedster"]
          : metaStyle === "yotsu"
            ? ["yotsu_specialist", "counter_specialist"]
            : ["all_rounder", "hybrid_oshi_yotsu"],
        preferredStyle: metaStyle as Style,
        statWeights: { power: 0.6, speed: 0.6, technique: 0.6, size: 0.5, potential: 0.8 },
        description: `Adapts recruitment to the current dominant style. Currently favoring ${metaStyle}.`,
      };
    }
    case "traditionalist":
      return {
        philosophy,
        preferredArchetypes: ["yotsu_specialist", "counter_specialist", "all_rounder"],
        preferredStyle: "yotsu",
        statWeights: { power: 0.8, speed: 0.3, technique: 0.7, size: 0.8, potential: 0.5 },
        description: "Old school. Believes in belt-wrestling, heavy training, and traditional methods.",
      };
    case "innovator":
      return {
        philosophy,
        preferredArchetypes: ["speedster", "trickster", "counter_specialist"],
        preferredStyle: "any",
        statWeights: { power: 0.3, speed: 0.9, technique: 0.8, size: 0.2, potential: 0.9 },
        description: "Seeks unconventional wrestlers who can outthink and outmaneuver opponents.",
      };
    case "size_matters":
      return {
        philosophy,
        preferredArchetypes: ["oshi_specialist", "all_rounder", "hybrid_oshi_yotsu"],
        preferredStyle: "oshi",
        statWeights: { power: 0.9, speed: 0.2, technique: 0.4, size: 1.0, potential: 0.5 },
        description: "Recruits the biggest, heaviest prospects. Believes mass wins matches.",
      };
    case "underdog_hunter":
      return {
        philosophy,
        preferredArchetypes: ["trickster", "speedster", "counter_specialist"],
        preferredStyle: "any",
        statWeights: { power: 0.4, speed: 0.5, technique: 0.5, size: 0.3, potential: 1.0 },
        description: "Scouts overlooked talent from obscure sources. Values raw potential over polish.",
      };
    case "balanced":
    default:
      return {
        philosophy: "balanced",
        preferredArchetypes: ["all_rounder", "hybrid_oshi_yotsu"],
        preferredStyle: "any",
        statWeights: { power: 0.6, speed: 0.6, technique: 0.6, size: 0.5, potential: 0.7 },
        description: "No strong recruitment bias. Evaluates each prospect on individual merit.",
      };
  }
}

/** Score a candidate for a given oyakata's preferences (0-100) */
export function scoreRecruitForOyakata(
  world: WorldState,
  oyakata: Oyakata,
  candidate: { archetype: TacticalArchetype; style: Style; talentSeed: number; weightPotentialKg: number }
): number {
  const profile = getOyakataStyleProfile(world, oyakata);
  let score = 50;

  // Archetype match bonus
  if (profile.preferredArchetypes.includes(candidate.archetype)) score += 20;

  // Style match
  if (profile.preferredStyle !== "any" && candidate.style === profile.preferredStyle) score += 15;
  if (profile.preferredStyle !== "any" && candidate.style !== profile.preferredStyle) score -= 10;

  // Stat weights
  score += candidate.talentSeed * profile.statWeights.potential * 0.2;
  score += (candidate.weightPotentialKg > 130 ? 10 : 0) * profile.statWeights.size;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Get a narrative label for the philosophy */
export function getPhilosophyLabel(philosophy: RecruitmentPhilosophy): string {
  const labels: Record<RecruitmentPhilosophy, string> = {
    style_purist: "Style Purist",
    meta_chaser: "Meta Chaser",
    traditionalist: "Stubborn Traditionalist",
    innovator: "Progressive Innovator",
    size_matters: "Size Obsessed",
    balanced: "Open-Minded",
    underdog_hunter: "Diamond Seeker",
  };
  return labels[philosophy];
}
