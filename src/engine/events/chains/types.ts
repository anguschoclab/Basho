/**
 * src/engine/events/chains/types.ts
 * =================================
 * Event-chain types — multi-week interactive story arcs that surface as
 * `chain_stage` pendingDecisions.
 *
 * Serialization rules (same as pendingCrisis):
 *  - `world.activeChains` holds ONLY ids/indices — no closures, no text.
 *  - All narrative text lives in bard domain `chains.*`; effects live in the
 *    registry keyed by chainId/stageId/optionId, re-derived at resolution.
 */

import type { Id } from "@/engine/types/common";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

/** Chain target — who the story is about and whose decision it becomes. */
export type ChainScope = "player_heya" | "rikishi";

/** Serializable effect descriptor applied on option resolution. */
export interface ChainEffects {
  /** Heya funds delta (yen). */
  funds?: number;
  /** Heya reputation delta (0-100 band). */
  reputation?: number;
  /** Heya scandal score delta. */
  scandalScore?: number;
  /** Welfare risk delta on the heya welfare state. */
  welfareRisk?: number;
  /** Roster morale delta on the heya welfare state. */
  morale?: number;
  /** Fatigue applied to every active rikishi of the heya. */
  rosterFatigue?: number;
  /** Momentum delta on the chain's subject rikishi (if bound). */
  momentum?: number;
  /** Media heya-pressure delta on the bound heya. */
  heyaPressure?: number;
  /** Political capital delta. */
  politicalCapital?: number;
}

export interface ChainOption {
  id: string;
  /** Bard path for the option label (`chains.<family>.<key>`). */
  labelPath: string;
  /** Optional yen cost of choosing this option. */
  feeYen?: number;
  /** Where the chain goes next; omit to end the chain. */
  nextStage?: { stageId: string; delayWeeks: number };
  /** Serializable effects applied on resolution. */
  effects?: ChainEffects;
}

export interface ChainStage {
  id: string;
  /** Bard path for the stage title. */
  titlePath: string;
  /** Bard path for the stage summary/decision description. */
  summaryPath: string;
  options: ChainOption[];
}

/** Guard signature — registry-side predicate (code, never serialized). */
export type ChainGuard = (world: WorldState, heya: Heya) => boolean;

export interface ChainTrigger {
  /** Relative weight in the weekly eligible-chain roll. */
  weight: number;
  /** Cycle phases in which this chain may fire (default: any). */
  phases?: Array<WorldState["cyclePhase"]>;
  /** Optional world-state predicate that must hold for the player heya. */
  guard?: ChainGuard;
  /** If true, the chain binds a subject rikishi (context %SHIKONA%). */
  needsRikishi?: boolean;
}

export interface EventChainDef {
  id: string;
  scope: ChainScope;
  trigger: ChainTrigger;
  /** Minimum weeks before the same chain can fire again after completing. */
  cooldownWeeks: number;
  stages: ChainStage[];
}

/**
 * Live chain instance — the ONLY chain data on WorldState.
 * `nextStageDueWeek` is the week the current stage's decision should surface.
 */
export interface ActiveChain {
  chainId: string;
  /** Index into `def.stages` of the pending stage. */
  stageIdx: number;
  /** Bound heya (player heya for scope "player_heya"/"rikishi"). */
  heyaId?: Id;
  /** Bound subject rikishi for needsRikishi chains. */
  rikishiId?: Id;
  /** Week the pending stage becomes due. */
  nextStageDueWeek: number;
}
