// @ts-nocheck
/**
 * AI / Oyakata Personality Types
 */

import type { Id } from "./common";
import type { AvatarConfig } from "./avatar";

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
  highestRank?: string;
  yearsInCharge: number;
  stats?: { scouting: number; training: number; politics: number };
  personality?: string;

  mood?: OyakataMood;
  quirks?: string[];
  avatarConfig?: AvatarConfig; // NEW: Procedural avatar configuration

  /** Phase 5: Succession Planning */
  successorCandidateId?: Id; // Pre-designated successor rikishi (alumni or roster)
  successionReadiness: number; // 0-100: triggered at age 60
  retirementYear?: number; // Set when succession is finalized
  isEmeritus?: boolean; // Retired elders who stay in the registry

  /** Drama Pass (Initiative 4) */
  grudges?: Id[]; // Heya or Oyakata IDs this person hates
  temperament?: "Stoic" | "Volatile" | "Vindictive";

  /** Phase 5: Succession Planning */
  successorCandidateId?: Id; // Pre-designated successor rikishi (can be set at any time)
  successionReadiness?: number; // 0-100: soft warning at 60, forced at 70 (age)
  retirementYear?: number; // Set when succession is triggered

  managerFlags?: {
    welfareHawk?: boolean;
    disciplineHawk?: boolean;
    publicityHawk?: boolean;
    nepotist?: boolean;
  };

  /**
   * AI Agent Architecture Components (Canon Directive 2026.04)
   * Implements "Skeptical Memory" and "Background Consolidation"
   */
  memory?: {
    /**
     * Recent observations (hints) about the roster/financials.
     * Used to resolve conflicting information over multiple ticks.
     */
    observations: Array<{
      tick: number;
      type: "perception" | "incident" | "alignment";
      summary: string;
      importance: number;
    }>;

    /**
     * The "Active Alignment" context.
     * Reinserted into the decision loop to prevent instruction drift.
     */
    coreDirectives: string[];

    /** Timestamp of last consolidation routine. */
    lastConsolidationTick: number;
  };
}