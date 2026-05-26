import { CombatArchetype, CombatProfile, Style } from "./types/combat";
import { SeededRNG } from "./rng";
import {
  ARCHETYPE_OSHI_THRESHOLD,
  ARCHETYPE_YOTSU_THRESHOLD,
  ARCHETYPE_TRICKSTER_THRESHOLD,
  ARCHETYPE_SPEEDSTER_THRESHOLD,
  ARCHETYPE_TSUPPARI_THRESHOLD,
  ARCHETYPE_DEFENSIVE_THRESHOLD,
  ARCHETYPE_GIANT_THRESHOLD,
} from "../constants/engine/archetype";

const ARCHETYPE_DEFINITIONS: Record<CombatArchetype, Omit<CombatProfile, "archetype">> = {
  trickster: {
    familyPreferences: { push: 10, belt: 15, trick: 55, speed: 20 },
    preferredGrip: "none",
    preferredGripDepth: "standard",
    // Technique-heavy; lower power and aggression (waits for the right moment)
    statModifiers: { technique: 1.2, speed: 1.1, weight: 0.9, power: 0.85, mental: 0.9 },
  },
  oshi: {
    familyPreferences: { push: 75, belt: 10, trick: 5, speed: 10 },
    preferredGrip: "none",
    preferredGripDepth: "standard",
    // High power and aggression (charges decisively); lower technique and composure
    statModifiers: { power: 1.1, speed: 1.1, technique: 0.8, mental: 0.85 },
  },
  yotsu: {
    familyPreferences: { push: 15, belt: 75, trick: 5, speed: 5 },
    preferredGrip: "migi",
    preferredGripDepth: "deep",
    // Strong and patient; deep grip fighters start with preferred grip depth advantage
    statModifiers: { power: 1.15, weight: 1.1, speed: 0.85, mental: 1.1 },
  },
  speedster: {
    familyPreferences: { push: 10, belt: 5, trick: 15, speed: 70 },
    preferredGrip: "none",
    preferredGripDepth: "maemitsu",
    // Fast and technical but physically weaker; moderate composure
    statModifiers: { speed: 1.25, technique: 1.1, weight: 0.85, power: 0.8 },
  },
  giant: {
    familyPreferences: { push: 40, belt: 50, trick: 5, speed: 5 },
    preferredGrip: "none",
    preferredGripDepth: "deep",
    // Maximum mass and power; unshakeable at edge; poor balance and technique
    statModifiers: { weight: 1.3, power: 1.2, speed: 0.7, balance: 0.9, mental: 1.1 },
  },
  hybrid: {
    familyPreferences: { push: 40, belt: 40, trick: 10, speed: 10 },
    preferredGrip: "none",
    preferredGripDepth: "standard",
    // Balanced across all dimensions
    statModifiers: { power: 1.05, technique: 1.05, weight: 1.05 },
  },
  /**
   * Tsuppari — rapid open-palm thrusting (Takakeisho style).
   * High aggression, no belt contact, tires quickly, poor edge composure (overcommits).
   */
  tsuppari: {
    familyPreferences: { push: 85, belt: 2, trick: 8, speed: 5 },
    preferredGrip: "none",
    preferredGripDepth: "standard",
    statModifiers: { power: 1.15, speed: 1.05, stamina: 0.85, technique: 0.9, mental: 0.8 },
    favoredKimarite: ["tsukidashi", "tsukitaoshi", "tsukiotoshi", "oshidashi", "hatakikomi"],
  },
  /**
   * Defensive — counter-wrestler archetype.
   * Low tachiai investment; reads and punishes opponent's aggression.
   * Highest mental composure — thrives in edge crisis situations.
   */
  defensive: {
    familyPreferences: { push: 10, belt: 35, trick: 40, speed: 15 },
    preferredGrip: "none",
    preferredGripDepth: "standard",
    statModifiers: {
      technique: 1.2,
      speed: 1.1,
      power: 0.9,
      balance: 1.15,
      weight: 0.95,
      mental: 1.25,
    },
    favoredKimarite: [
      "hatakikomi",
      "hikiotoshi",
      "tsukiotoshi",
      "uwatenage",
      "ketaguri",
      "katasukashi",
    ],
  },
};

export const ARCHETYPE_DESCRIPTIONS: Record<CombatArchetype, string> = {
  trickster:
    "Technique-heavy fighter who waits for the right moment. Uses tricks and speed over raw power.",
  oshi: "Pushing specialist who charges decisively. High power and aggression, but lower technique and composure.",
  yotsu:
    "Grappling specialist who seeks a deep belt grip. Strong and patient fighters who dominate once secured.",
  speedster:
    "Fast and technical but physically weaker. Uses speed and footwork to avoid direct confrontation.",
  giant:
    "Maximum mass and power. Unshakeable at the edge but poor balance and technique. Relies on brute force.",
  hybrid:
    "Balanced across all dimensions. Adaptable fighter capable of both pushing and grappling techniques.",
  tsuppari:
    "Rapid open-palm thrusting specialist. High aggression with no belt contact. Tires quickly and overcommits.",
  defensive:
    "Counter-wrestler who reads and punishes opponent's aggression. Highest mental composure in edge crises.",
};

/**
 * Get archetype description for UI tooltips.
 */
export function getCombatArchetypeDescription(archetype: CombatArchetype): string {
  return ARCHETYPE_DESCRIPTIONS[archetype];
}

/**
 * Randomly assign an archetype based on a realistic population distribution.
 * Oshi and yotsu together ~57% (dominates real makuuchi).
 * Tsuppari 7%, defensive 6% added for gameplay variety.
 */
export function rollArchetype(rng: SeededRNG): CombatArchetype {
  const roll = rng.next();
  if (roll < ARCHETYPE_OSHI_THRESHOLD) return "oshi";
  if (roll < ARCHETYPE_YOTSU_THRESHOLD) return "yotsu";
  if (roll < ARCHETYPE_TRICKSTER_THRESHOLD) return "trickster";
  if (roll < ARCHETYPE_SPEEDSTER_THRESHOLD) return "speedster";
  if (roll < ARCHETYPE_TSUPPARI_THRESHOLD) return "tsuppari";
  if (roll < ARCHETYPE_DEFENSIVE_THRESHOLD) return "defensive";
  if (roll < ARCHETYPE_GIANT_THRESHOLD) return "giant";
  return "hybrid";
}

/**
 * Build a full CombatProfile for a given archetype.
 */
export function buildCombatProfile(archetype: CombatArchetype): CombatProfile {
  return {
    archetype,
    ...ARCHETYPE_DEFINITIONS[archetype],
  };
}

/**
 * Derive which fighting styles a rikishi is weak against, based on archetype.
 * Follows the TACTICAL_MATRIX rock-paper-scissors triangle:
 *   oshi → weak to hybrid  (trick beats push)
 *   yotsu → weak to oshi   (push beats belt)
 *   hybrid → weak to yotsu (belt beats trick/speed)
 */
export function deriveWeakAgainstStyles(archetype: CombatArchetype): Style[] {
  const style =
    archetype === "oshi" || archetype === "tsuppari"
      ? "oshi"
      : archetype === "yotsu" || archetype === "giant"
        ? "yotsu"
        : "hybrid";
  if (style === "oshi") return ["hybrid"];
  if (style === "yotsu") return ["oshi"];
  return ["yotsu"]; // hybrid
}
