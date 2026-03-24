/**
 * Combat / Style Types
 */

export type CombatArchetype = "oshi" | "yotsu" | "technician";

export type TechnicalMove = "henka" | "ashitori" | "none";

export interface CombatProfile {
  proficiencies: Record<CombatArchetype, number>;
  preferredStyle: CombatArchetype;
  specialties: TechnicalMove[];
  ringSense: number;
  aggressiveness: number;
}

// Define the base tactical families
export type TacticalFamily = 'push' | 'belt' | 'trick' | 'speed';

// Matrix: Define what counters what
export const TACTICAL_MATRIX: Record<TacticalFamily, TacticalFamily[]> = {
  'push': ['belt'],     // Pusher keeps grappler away
  'belt': ['trick', 'speed'], // Grappler crushes tricks once grabbed
  'trick': ['push'],    // Trickster uses pusher's momentum against them
  'speed': ['push', 'belt']   // Speedster flanks slow heavy fighters
};

export interface CombatAction {
  family: TacticalFamily;
  intent: 'attack' | 'defend' | 'counter' | 'reposition';
  targetKimariteClass?: KimariteClass; // The move they are attempting
  statWeighting: {
    // Defines which stats matter for THIS specific move (0.0 to 1.0)
    strength: number;
    weight: number;
    technique: number;
    speed: number;
    balance: number;
  };
}

export type ActionPreference = Record<TacticalFamily, number>;

export type Style = "oshi" | "yotsu" | "hybrid";

/** Type representing stance. */
export type Stance =
  | "migi-yotsu"
  | "hidari-yotsu"
  | "no-grip"
  | "belt-dominant"
  | "push-dominant";

/** Type representing tactical archetype. */
export type TacticalArchetype =
  | "oshi_specialist"
  | "yotsu_specialist"
  | "speedster"
  | "trickster"
  | "all_rounder"
  | "hybrid_oshi_yotsu"
  | "counter_specialist";

/** Primary Rikishi Archetype (Derived) */
export type RikishiArchetype =
  | "Defensive_Stalwart"
  | "Explosive_Blitzer"
  | "Acrobatic_Trickster"
  | "Immovable_Mountain"
  | "All_Rounder";

/** Type representing kimarite family. */
type KimariteFamily = "OSHI" | "YOTSU" | "THROW" | "TRIP" | "PULLDOWN" | "REVERSAL" | "SPECIAL";

/** Type representing kimarite id. */
export type KimariteId = string;

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

/** a r c h e t y p e_ p r o f i l e s. */
export const ARCHETYPE_PROFILES: Record<
  TacticalArchetype,
  {
    tachiaiBonus: number;
    gripPreference: number;
    preferredClasses: KimariteClass[];
    volatility: number;
    counterBonus: number;
    baseRisk: number;
    familyBias: Record<KimariteFamily, number>;
    actionPreferences: ActionPreference;
  }
> = {
  oshi_specialist: {
    tachiaiBonus: 8,
    gripPreference: -0.5,
    preferredClasses: ["force_out", "push", "thrust"],
    volatility: 0.2,
    counterBonus: 0,
    baseRisk: 0.6,
    familyBias: { OSHI: 1.45, YOTSU: 0.85, THROW: 0.9, TRIP: 0.95, PULLDOWN: 0.8, REVERSAL: 0.9, SPECIAL: 0.75 },
    actionPreferences: { push: 0.85, belt: 0.05, trick: 0.05, speed: 0.05 }
  },
  yotsu_specialist: {
    tachiaiBonus: -3,
    gripPreference: 1,
    preferredClasses: ["throw", "lift", "twist"],
    volatility: 0.15,
    counterBonus: 5,
    baseRisk: 0.45,
    familyBias: { OSHI: 0.85, YOTSU: 1.4, THROW: 1.35, TRIP: 0.95, PULLDOWN: 0.8, REVERSAL: 1.05, SPECIAL: 0.8 },
    actionPreferences: { belt: 0.80, push: 0.10, trick: 0.05, speed: 0.05 }
  },
  speedster: {
    tachiaiBonus: 5,
    gripPreference: -0.3,
    preferredClasses: ["trip", "slap_pull", "evasion"],
    volatility: 0.5,
    counterBonus: 8,
    baseRisk: 0.55,
    familyBias: { OSHI: 0.95, YOTSU: 0.9, THROW: 0.95, TRIP: 1.45, PULLDOWN: 1.0, REVERSAL: 1.1, SPECIAL: 0.9 },
    actionPreferences: { speed: 0.70, push: 0.10, trick: 0.15, belt: 0.05 }
  },
  trickster: {
    tachiaiBonus: 0,
    gripPreference: 0,
    preferredClasses: ["slap_pull", "trip", "special"],
    volatility: 0.6,
    counterBonus: 12,
    baseRisk: 0.65,
    familyBias: { OSHI: 0.9, YOTSU: 0.85, THROW: 0.9, TRIP: 1.05, PULLDOWN: 1.45, REVERSAL: 1.25, SPECIAL: 1.1 },
    actionPreferences: { trick: 0.60, speed: 0.40, push: 0.0, belt: 0.0 }
  },
  all_rounder: {
    tachiaiBonus: 2,
    gripPreference: 0,
    preferredClasses: ["force_out", "throw", "push"],
    volatility: 0.25,
    counterBonus: 3,
    baseRisk: 0.5,
    familyBias: { OSHI: 1.0, YOTSU: 1.0, THROW: 1.0, TRIP: 1.0, PULLDOWN: 1.0, REVERSAL: 1.0, SPECIAL: 1.0 },
    actionPreferences: { push: 0.25, belt: 0.25, trick: 0.25, speed: 0.25 }
  },
  hybrid_oshi_yotsu: {
    tachiaiBonus: 3,
    gripPreference: 0.2,
    preferredClasses: ["force_out", "throw", "push", "lift"],
    volatility: 0.3,
    counterBonus: 5,
    baseRisk: 0.52,
    familyBias: { OSHI: 1.2, YOTSU: 1.2, THROW: 1.1, TRIP: 0.95, PULLDOWN: 0.85, REVERSAL: 1.05, SPECIAL: 0.9 },
    actionPreferences: { push: 0.45, belt: 0.45, trick: 0.05, speed: 0.05 }
  },
  counter_specialist: {
    tachiaiBonus: -2,
    gripPreference: 0.3,
    preferredClasses: ["throw", "trip"],
    volatility: 0.35,
    counterBonus: 15,
    baseRisk: 0.48,
    familyBias: { OSHI: 0.9, YOTSU: 1.0, THROW: 1.1, TRIP: 1.1, PULLDOWN: 0.9, REVERSAL: 1.5, SPECIAL: 1.05 },
    actionPreferences: { trick: 0.40, belt: 0.30, push: 0.20, speed: 0.10 }
  }
};

/** Type representing bout tactic. */
export type BoutTactic = "STANDARD" | "YOTSU_BELT" | "OSHI_THRUST" | "HENKA";

/** Defines the structure for tactical result. */
export interface TacticalResult {
  playerTactic: BoutTactic;
  cpuTactic: BoutTactic;
  advantage: "PLAYER" | "CPU" | "NEUTRAL";
  winProbabilityShift: number;
}
