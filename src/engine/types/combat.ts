import { RikishiStats } from "./rikishi";

/**
 * Combat / Style Types
 */

export type CombatArchetype =
  | "oshi" // Push/thrust dominant
  | "yotsu" // Belt specialist
  | "trickster" // Pulldowns, feints, unconventional
  | "speedster" // Angle-based, quick feet
  | "hybrid" // Balanced push/belt approach
  | "giant" // Mass-dominant
  | "tsuppari" // Rapid open-palm thrusting (no belt contact)
  | "defensive"; // Counter-wrestler — absorbs pressure, punishes commitment

export type GripPreference = "migi" | "hidari" | "none"; // Right-inside, Left-inside, or no preference
export type GripDepthPreference = "maemitsu" | "deep" | "standard"; // Front-belt, Deep-back, or Standard

export interface CombatProfile {
  archetype: CombatArchetype;
  // The % chance the AI will select a specific family during the Engagement Phase
  familyPreferences: {
    push: number;
    belt: number;
    trick: number;
    speed: number;
  };
  preferredGrip: GripPreference;
  preferredGripDepth: GripDepthPreference;
  // Base stat generation modifiers (mean offsets applied during creation)
  // e.g., A speedster might have { speed: 1.1, weight: 0.9 }
  // Note: 'power' maps to RikishiStats.power → Rikishi.power in the generation pipeline.
  statModifiers: Partial<Record<keyof RikishiStats | "weight" | "height" | "power", number>>;
  favoredKimarite?: string[];
}

// Define the base tactical families
export type TacticalFamily = "push" | "belt" | "trick" | "speed";

// Matrix: Define what counters what
export const TACTICAL_MATRIX: Record<TacticalFamily, TacticalFamily[]> = {
  push: ["belt"], // Pusher keeps grappler away
  belt: ["trick", "speed"], // Grappler crushes tricks once grabbed
  trick: ["push"], // Trickster uses pusher's momentum against them
  speed: ["push", "belt"], // Speedster flanks slow heavy fighters
};

// Maps each player-facing BoutTactic to its underlying TacticalFamily
// so TACTICAL_MATRIX can evaluate counter advantages.
export const TACTIC_TO_FAMILY: Record<BoutTactic, TacticalFamily> = {
  STANDARD: "push",
  OSHI_THRUST: "push",
  YOTSU_BELT: "belt",
  DEFENSIVE_PULL: "trick",
  HENKA: "trick",
  ALL_OUT: "push",
};

export const COUNTER_TACTIC_BONUS = 5;

export function resolveCounterTacticBonus(
  tactic: BoutTactic,
  opponentProfile: CombatProfile
): number {
  if (tactic === "STANDARD") return 0;
  const family = TACTIC_TO_FAMILY[tactic] ?? "push";
  const sorted = (
    Object.entries(opponentProfile.familyPreferences) as [TacticalFamily, number][]
  ).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[0] ?? "push";
  const second = sorted[1]?.[1] ?? 0;
  // Only apply counter bonus when there's a clearly dominant family (not tied)
  if ((sorted[0]?.[1] ?? 0) <= second) return 0;
  const counters = TACTICAL_MATRIX[family] ?? [];
  return counters.includes(top) ? COUNTER_TACTIC_BONUS : 0;
}

export type HandPosition = "inside" | "outside" | "blocked";
export type GripDepth = "maemitsu" | "deep" | "standard";

export interface GrappleState {
  east: { rightHand: HandPosition; leftHand: HandPosition; depth: GripDepth };
  west: { rightHand: HandPosition; leftHand: HandPosition; depth: GripDepth };
  gripAdvantage: "east_strong" | "west_strong" | "neutral" | "moro_zashi_east" | "moro_zashi_west";
}

/** Type representing stance. */
export type Stance = "migi-yotsu" | "hidari-yotsu" | "no-grip" | "belt-dominant" | "push-dominant";

/** Type representing kimarite id. */
export type KimariteId =
  | "yorikiri"
  | "oshidashi"
  | "oshitaoshi"
  | "yoritaoshi"
  | "tsukidashi"
  | "tsukitaoshi"
  | "abisetaoshi"
  | "hatakikomi"
  | "hikiotoshi"
  | "okuridashi"
  | "tsuriotoshi"
  | "tsuridashi"
  | "utchari"
  | "okuritaoshi"
  | "katasukashi"
  | "sokubiotoshi"
  | "okurigake"
  | "okurihikiotoshi"
  | "waridashi"
  | "okurinage"
  | "tsukaminage"
  | "okuritsuridashi"
  | "okuritsuriotoshi"
  | "yobimodoshi"
  | "ushiromotare"
  | "uwatenage"
  | "sukuinage"
  | "shitatenage"
  | "kotenage"
  | "shitatedashinage"
  | "uwatedashinage"
  | "kubinage"
  | "koshihineri"
  | "ipponzeoi"
  | "nichonage"
  | "yaguranage"
  | "kakenage"
  | "tsukiotoshi"
  | "tottari"
  | "shitatehineri"
  | "uwatehineri"
  | "kotehineri"
  | "amiuchi"
  | "kainahineri"
  | "zubuneri"
  | "sakatottari"
  | "kubiotoshi"
  | "gasshohineri"
  | "harimanage"
  | "osakate"
  | "sabaori"
  | "sotokomata_hinerite"
  | "tokkurinage"
  | "makiotoshi"
  | "uchimuso"
  | "sotomuso"
  | "ashitori"
  | "sotogake"
  | "uchigake"
  | "ketaguri"
  | "watashikomi"
  | "kekaeshi"
  | "kosotogake"
  | "komatasukui"
  | "chongake"
  | "kawarigake"
  | "susoharai"
  | "kirikaeshi"
  | "nimaigeri"
  | "omata"
  | "susotori"
  | "mitokorozeme"
  | "kosotogari"
  | "tsumatori"
  | "izori"
  | "kakezori"
  | "shumokuzori"
  | "sototasukizori"
  | "tasukizori"
  | "tsutaezori"
  | "kimedashi"
  | "kimetaoshi"
  | "isamiashi"
  | "koshikudake"
  | "tsukite"
  | "tsukihiza"
  | "fumidashi"
  | "fusensho"
  | "hansoku";

/** Type representing kimarite class. */
export type KimariteClass =
  | "force_out"
  | "push"
  | "thrust"
  | "throw"
  | "trip"
  | "twist"
  | "slap_pull"
  | "lift"
  | "rear"
  | "evasion"
  | "special"
  | "result"
  | "forfeit";

/** Type representing bout tactic. */
export type BoutTactic =
  | "STANDARD"
  | "YOTSU_BELT"
  | "OSHI_THRUST"
  | "HENKA"
  | "DEFENSIVE_PULL"
  | "ALL_OUT";

/** Defines the structure for tactical result. */
export interface TacticalResult {
  playerTactic: BoutTactic;
  cpuTactic: BoutTactic;
  advantage: "PLAYER" | "CPU" | "NEUTRAL";
  winProbabilityShift: number;
}

export interface BoutTickContext {
  // Contextual tags for text decorators
  attackerFatigueLevel: "fresh" | "gasping" | "exhausted";
  defenderBalanceLevel: "planted" | "wobbling" | "critical";
  isEdgeOfRing: boolean;

  // Memory flags
  isRepeatedAction: boolean; // e.g., "He tries the thrust AGAIN!"
  isReversal: boolean; // Power differential flipped from last tick

  // Stakes
  isRivalry: boolean;
  isChampionshipBout: boolean;
}

export type Style = "oshi" | "yotsu" | "hybrid";
