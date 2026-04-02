import type { TacticalFamily } from "./combat";

/** Defines the JSA official categories for kimarite. */
export type JsaCategory = 'Kihonwaza' | 'Nageite' | 'Kakeite' | 'Sorite' | 'Hinerite' | 'Tokushuwaza' | 'Hiwaza';

/** Defines specific positional/physical requirements for a move. */
export interface KimariteRequirements {
  edgeOfRing?: boolean;
  maxAttackerBalance?: number;
  minStrengthDifferential?: number;
  canFlank?: boolean;
  requiresWeightAdvantage?: boolean;
  isDesperation?: boolean;
  requiredGrip?: {
    rightHand?: 'inside' | 'outside';
    leftHand?: 'inside' | 'outside';
    anyHand?: 'inside' | 'outside';
    depth?: 'maemitsu' | 'deep' | 'standard';
  };
}

/** Defines the structure for kimarite. */
export interface Kimarite {
  id: string;
  name: string;
  nameJa?: string;
  jsaCategory: JsaCategory;
  tacticalFamily: TacticalFamily;
  baseWeight: number;
  isHighRisk?: boolean;
  requirements?: KimariteRequirements;
  
  statWeights: {
    strength: number;
    weight: number;
    speed: number;
    technique: number;
    balance: number;
  };
  
  requiresBeltGrip?: boolean;
  leverageTarget?: 'high_center_of_gravity' | 'momentum';

  description?: string;
  rarity?: "common" | "uncommon" | "rare" | "legendary";
}

/** Type representing kimarite class (for engine grouping). */
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
