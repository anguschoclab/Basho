/**
 * AI / Oyakata Personality Types
 */

import type { Id } from "./common";

/** Type representing oyakata archetype. */
export type OyakataArchetype =
  | "traditionalist"
  | "scientist"
  | "gambler"
  | "nurturer"
  | "tyrant"
  | "strategist";

/** Defines the structure for oyakata traits. */
export interface OyakataTraits {
  ambition: number;
  patience: number;
  risk: number;
  tradition: number;
  compassion: number;
}

/** Defines the structure for oyakata. */
export interface Oyakata {
  id: Id;
  heyaId: Id;
  name: string;
  age: number;
  archetype: OyakataArchetype;
  traits: OyakataTraits;

  formerShikona?: string;
  highestRank?: string;
  yearsInCharge: number;
  stats?: { scouting: number; training: number; politics: number };
  personality?: string;

  mood?: OyakataMood;
  quirks?: string[];
  managerFlags?: {
    welfareHawk?: boolean;
    disciplineHawk?: boolean;
    publicityHawk?: boolean;
    nepotist?: boolean;
  };
}
