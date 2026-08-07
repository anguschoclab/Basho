/**
 * AI / Oyakata Personality Types
 */

import type { Id } from "./common";
import type { AvatarConfig } from "./avatar";
import type { OyakataMemory } from "../ai/types";

/** Mood state for an Oyakata — affects training intensity and decision risk. */
export type OyakataMood =
  | "content"
  | "determined"
  | "anxious"
  | "frustrated"
  | "furious"
  | "obsessed"
  | "defeated"
  | "inspired";

/** Type representing oyakata archetype. */
export type OyakataArchetype =
  | "traditionalist"
  | "scientist"
  | "gambler"
  | "nurturer"
  | "tyrant"
  | "strategist"
  | "strict"
  | "indulgent";

/** Defines the structure for oyakata traits. */
export interface OyakataTraits {
  ambition: number;
  patience: number;
  risk: number;
  tradition: number;
  compassion: number;
}

/** Succession lifecycle stage — set by DynastyService.tickSuccessionCheck based on oyakata age. */
export type SuccessionReadiness = "stable" | "transitioning" | "mandatory";

/** Defines the structure for oyakata. */
export interface Oyakata {
  id: Id;
  heyaId: Id;
  name: string;
  shikona: string;
  age: number;
  archetype: OyakataArchetype;
  traits: OyakataTraits;

  formerShikona?: string;
  formerRikishiId?: string;
  backstoryId?: string;
  highestRank?: string;
  yearsInCharge: number;
  stats?: { scouting: number; training: number; politics: number };
  personality?: string;

  mood?: OyakataMood;
  quirks?: string[];
  avatarConfig?: AvatarConfig; // NEW: Procedural avatar configuration

  isEmeritus?: boolean; // Retired elders who stay in the registry

  /** Drama Pass (Initiative 4) */
  grudges?: Id[]; // Heya or Oyakata IDs this person hates
  temperament?: "Stoic" | "Volatile" | "Vindictive";

  /** Phase 5: Succession Planning */
  successorCandidateId?: Id; // Pre-designated successor rikishi (can be set at any time)
  successionReadiness?: SuccessionReadiness; // Lifecycle stage set by DynastyService.tickSuccessionCheck
  retirementYear?: number; // Set when succession is triggered

  managerFlags?: {
    welfareHawk?: boolean;
    disciplineHawk?: boolean;
    publicityHawk?: boolean;
    nepotist?: boolean;
  };

  /**
   * AI Agent Architecture Components (Canon Directive 2026.04)
   * Implements "Skeptical Memory" and "Background Consolidation".
   * Extended by the unified AI layer for plans, opponent models, and decision history.
   */
  memory?: OyakataMemory;
}

/** Configuration provided by the player at new-game wizard — applied to their oyakata on world creation. */
export interface OyakataCreationConfig {
  /** Player-chosen toshiyori (elder) name */
  name: string;
  /** ID into OYAKATA_BACKSTORIES constant — e.g. "yokozuna_champion" */
  backstoryId: string;
  /** Optional ichimon (faction) ID selected in wizard step 2 */
  ichimon?: import("./economy").IchimonName;
}
