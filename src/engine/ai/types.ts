/**
 * Cross-cutting types for the advanced AI layer.
 *
 * These types are consumed by StrategicPlanner, TacticalCoordinator,
 * BoutAI, CornerAdvice, and AdvisorService. They are pure data contracts;
 * no logic lives here.
 */

import type { Id } from "../types/common";
import type { OyakataArchetype } from "../types/oyakata";
import type { WorldState } from "../types/world";
import type { PerceptionSnapshot } from "../perception";

export type AIGoalDomain = "rank" | "finance" | "rivalry" | "recruitment" | "reputation" | "training";

export interface AIGoal {
  domain: AIGoalDomain;
  target: string;
  priority: number;
  deadlineWeek?: number;
}

export type AIConstraintType =
  | "max_intensity"
  | "min_reserve"
  | "avoid_rival"
  | "protect_rikishi";

export interface AIConstraint {
  domain: AIGoalDomain;
  type: AIConstraintType;
  value: unknown;
}

export interface AIPlan {
  heyaId: Id;
  archetype: OyakataArchetype;
  planId: string;
  goals: AIGoal[];
  constraints: AIConstraint[];
  estimatedWeeks: number;
  startedWeek: number;
  reasoning: string[];
}

export type AIRecommendationCategory =
  | "training"
  | "recruitment"
  | "finance"
  | "bout"
  | "governance";

export type AIRecommendationPriority = "low" | "medium" | "high" | "critical";

export interface AIRecommendation {
  id: string;
  category: AIRecommendationCategory;
  priority: AIRecommendationPriority;
  title: string;
  detail: string;
  relatedEntityId?: string;
  suggestedAction?: string;
  reasoning: string[];
}

/** Context object passed to all advanced AI decision modules. */
export interface AIContext {
  world: WorldState;
  heyaId: Id;
  oyakata?: {
    id: Id;
    archetype: OyakataArchetype;
    traits: { ambition: number; risk: number; tradition: number; patience: number; compassion: number };
    mood?: string;
  };
  perception?: PerceptionSnapshot;
  leaguePerception?: LeaguePerception;
  memory?: OyakataMemory;
}

// === Memory & Perception types =================================================

/** A single historical observation stored in oyakata memory. */
export interface OyakataObservation {
  tick: number;
  type: "perception" | "incident" | "alignment" | "plan_change";
  summary: string;
  importance: number;
}

/** Per-rikishi learned model of preferred tactics. */
export interface OpponentTacticModel {
  rikishiId: Id;
  sampleSize: number;
  /** Tally of tactical families observed in recent bouts. */
  familyCounts: {
    push: number;
    belt: number;
    trick: number;
    speed: number;
  };
  /** Most frequently observed BoutTactic. */
  mostUsedTactic?: string;
  /** Last updated week. */
  lastUpdated: number;
}

/** Per-oyakata persistent memory used by the AI layers. */
export interface OyakataMemory {
  observations: OyakataObservation[];
  coreDirectives: string[];
  lastConsolidationTick: number;
  /** Currently active strategic plan. */
  activePlan?: AIPlan;
  /** History of plans and their outcomes. */
  planHistory: {
    planId: string;
    startedWeek: number;
    endedWeek?: number;
    outcome?: "success" | "partial" | "abandoned";
    summary?: string;
  }[];
  /** Recent weekly decisions for outcome learning. */
  decisionHistory: {
    week: number;
    year: number;
    planId?: string;
    summary: string;
  }[];
  /** Learned opponent tactic models keyed by rikishi id. */
  opponentModels: Record<Id, OpponentTacticModel>;
}

/** Promotion / demotion pressure snapshot for one division. */
export interface DivisionPressure {
  division: string;
  leaders: { rikishiId: Id; shikona: string; wins: number; losses: number }[];
  relegationLine: { rikishiId: Id; shikona: string; wins: number; losses: number }[];
  hasActiveYushoRace: boolean;
  daysRemaining: number;
}

/** Snapshot of the yusho race. */
export interface YushoRaceSnapshot {
  leaders: { rikishiId: Id; shikona: string; wins: number; losses: number }[];
  isClinched: boolean;
}

/** A cluster of rivalries involving a common rikishi or heya. */
export interface RivalryCluster {
  keyRikishiId: Id;
  rivalIds: Id[];
  averageHeat: number;
}

/** League-wide derived view used by strategic planners. */
export interface LeaguePerception {
  generatedAtWeek: number;
  generatedAtYear: number;
  /** Promotion/demotion pressure per division. */
  divisionPressures: Record<string, DivisionPressure>;
  /** Overall yusho race. */
  yushoRace: YushoRaceSnapshot;
  /** Heya IDs with critical runway or welfare risk. */
  financiallyFragileHeyas: Id[];
  /** Detected rivalry clusters. */
  rivalryClusters: RivalryCluster[];
  /** True if a high-potential recruit is visible in the talent pool. */
  topRecruitAvailable: boolean;
}
