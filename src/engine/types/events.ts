/**
 * src/engine/types/events.ts
 * ==========================
 * Event Bus System Types (The Keystone System)
 *
 * Defines types for the event bus system that powers narrative generation
 * and game state notifications throughout the engine.
 *
 * @see EventBus for event emission and subscription
 */

import type { Id } from "./common";

/**
 * Type representing event scope.
 * Determines which entities can receive or respond to an event.
 */
export type EventScope = "world" | "heya" | "rikishi";

/**
 * Type representing event phase.
 * MENTOR_MENTEE_BOUT: Fired when a mentor faces their apprentice in a basho bout.
 */
export type EngineEventType =
  | "BOUT_RESOLVED" // A bout has been resolved with a result
  | "RECRUIT_DISCOVERED" // A new recruit has been discovered
  | "MONTHLY_FINANCE_REPORT" // Monthly financial report generated
  | "MANAGEMENT_DECISION" // Player made a management decision
  | "STRATEGY_SHIFT" // Training or strategy was shifted
  | "RIVALRY_HEAT_SPIKE" // Rivalry heat crossed a threshold
  | "SPARRING_RIVALRY_SEEDED" // Rivalry seeded from sparring partnership
  | "MEDICAL_REPORT" // Medical status report generated
  | "TRAINING_UPDATE" // Training results update
  | "TRAINING_STAT_DELTA" // Per-stat weekly training gains attribution
  | "GOVERNANCE_RULING" // A governance ruling was issued
  | "FINANCIAL_ALERT" // Financial alert triggered
  | "AWARD_CONFERRED" // An award was conferred
  | "LIFECYCLE_EVENT" // Career lifecycle event (retirement, promotion, etc.)
  | "RETIREMENT_ANNOUNCED" // Career lifecycle — intai (retirement) announcement
  | "BASHO_STATUS" // Basho status update
  | "WELFARE_COMPLIANCE" // Welfare compliance check
  | "OYAKATA_MOOD_SHIFT" // Oyakata mood changed
  | "NPC_MANAGER_DECISION" // NPC manager made a decision
  | "NARRATIVE_STRATEGY_SHIFT" // Narrative strategy shifted
  | "FACILITY_UPGRADED" // Facility was upgraded
  | "FACILITY_DEGRADED" // Facility was degraded
  | "ROSTER_OVERFLOW_RELEASE" // Rikishi released due to roster overflow
  | "PROMOTION_DELIBERATION" // Promotion deliberation occurred
  | "GLOBAL_CUP" // Global Cup event
  | "GLOBAL_CUP_START" // Global Cup tournament started
  | "GLOBAL_CUP_FINALE" // Global Cup tournament concluded
  | "CONSTRUCTION_STARTED" // Infrastructure construction started
  | "CONSTRUCTION_COMPLETED" // Infrastructure construction completed
  | "KESHO_CREATED" // Kesho mawashi created
  | "KESHO_UPGRADED" // Kesho mawashi upgraded
  | "YOKOZUNA_TSUNA_CREATED" // Yokozuna tsuna created
  | "KESHO_MAWASHI_CREATED" // Kesho mawashi created
  | "NARRATIVE_CRISIS_TRIGGERED" // Narrative crisis was triggered
  | "MENTOR_MENTEE_BOUT" // Mentor faced apprentice in bout
  | "DECISION_AUTO_RESOLVED" // A loop decision was auto-resolved during autonomous sim
  | "DECISION_RESOLVED" // A loop decision was resolved (interactive or auto)
  | "RIVAL_POSTURE" // AI rival posture / intelligence assessment
  | "SPONSOR_UPDATE" // Sponsor contract renewal or change
  | "PHASE_TRANSITION" // General phase transition event
  | "POLITICAL_FAVOR_REDEEMED"; // Political favor was redeemed

/**
 * Type representing event phase.
 * Determines when in the game cycle the event occurs.
 */
export type EventPhase = "weekly" | "monthly" | "basho_day" | "basho_wrap" | "manual";

/**
 * Type representing event category.
 * Used to group events for filtering and narrative generation.
 */
export type EventCategory =
  | "training" // Training-related events
  | "scouting" // Recruitment and scouting events
  | "injury" // Injury and medical events
  | "economy" // Financial and economic events
  | "sponsor" // Sponsor and kensho events
  | "media" // Media and publicity events
  | "rivalry" // Rivalry and relationship events
  | "promotion" // Promotion and demotion events
  | "discipline" // Disciplinary events
  | "facility" // Facility management events
  | "milestone" // Career milestone events
  | "match" // Match and bout events
  | "basho" // Basho-wide events
  | "career" // Career lifecycle events
  | "welfare" // Welfare and compliance events
  | "narrative" // Narrative and story events
  | "ai_decision" // AI-driven management decision events
  | "ai_plan_change" // AI strategic plan change events
  | "ai_rival_posture" // AI rival posture / intelligence events
  | "misc"; // Miscellaneous events

/**
 * Type representing event importance.
 * Determines UI display priority and narrative significance.
 */
export type EventImportance = "minor" | "notable" | "major" | "headline";

/**
 * Defines the structure for narrative context (A11 Narrative Contract).
 * Provides a standardized data structure for narrative generation.
 */
export interface NarrativeContext {
  // Entities for Linking
  /** Shikona of the primary rikishi. */
  shikona?: string;
  /** ID of the primary rikishi. */
  rikishiId?: string;
  /** Shikona of the rival rikishi. */
  rival?: string;
  /** ID of the rival rikishi. */
  rivalId?: string;
  /** Rank of the rikishi. */
  rank?: string;
  /** Name of the heya. */
  heya?: string;
  /** ID of the heya. */
  heyaId?: string;
  /** Alias for heya (stable). */
  stable?: string;
  /** Alias for heyaId (stableId). */
  stableId?: string;
  /** Shikona of the winner. */
  winner?: string;
  /** ID of the winner. */
  winnerId?: string;
  /** Shikona of the loser. */
  loser?: string;
  /** ID of the loser. */
  loserId?: string;
  /** Name of the oyakata. */
  oyakata?: string;
  /** ID of the oyakata. */
  oyakataId?: string;

  /** Winning technique (kimarite). */
  kimarite?: string;
  /** Legacy support for rikishiRivalId. */
  rikishiRivalId?: string;
  /** Legacy support for winnerRikishiId. */
  winnerRikishiId?: string;
  /** Legacy support for loserRikishiId. */
  loserRikishiId?: string;

  // Economy
  /** Money amount (auto-formatted). */
  money?: number;
  /** Kensho count (auto-formatted). */
  kensho?: number;
  /** Cost amount (auto-formatted). */
  cost?: number;
  /** Revenue amount. */
  revenue?: number;
  /** Profit amount. */
  profit?: number;

  // Physics / Stats
  /** Rate percentage (auto-formatted). */
  rate?: number;
  /** Chance percentage (auto-formatted). */
  chance?: number;
  /** Score value. */
  score?: number;
  /** Delta change value. */
  delta?: number;
  /** Intensity level. */
  intensity?:
    | "high_stakes"
    | "technical"
    | "neutral"
    | "conservative"
    | "balanced"
    | "intensive"
    | "punishing"
    | "low"
    | "normal"
    | "high"
    | "extreme"
    | number;

  // Domain Specific
  /** Severity level of the event. */
  severity?: "minor" | "moderate" | "serious" | "critical";
  /** Incident description. */
  incident?: string;
  /** Reason for the event. */
  reason?: string;
  /** Training regimen or similar. */
  regimen?: string;
  /** Status description. */
  status?: string;
  /** Threshold value. */
  threshold?: number;
  /** Heat level (for rivalries). */
  heat?: number;
  /** Day number. */
  day?: number;
  /** Career phase of the rikishi for narrative context. */
  careerPhase?: string;

  /** Index signature for additional custom fields. */
  [key: string]: string | number | boolean | object | null | undefined;
}

/**
 * Defines the structure for engine event.
 * Represents a single event in the event log.
 */
export interface EngineEvent {
  /** Unique identifier for this event. */
  id: Id;
  /** Type of event. */
  type: EngineEventType;

  /** ID of the causal event if this event was triggered by another. */
  causalEventId?: Id;

  // Temporal
  /** Year when this event occurred. */
  year: number;
  /** Week when this event occurred. */
  week: number;
  /** Month when this event occurred. */
  month?: number;
  /** Basho number (1-6) if during a basho. */
  bashoNumber?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Day of the basho (1-15) if during a basho. */
  day?: number;

  /** Phase of the game cycle when this event occurred. */
  phase: EventPhase;
  /** Category of this event. */
  category: EventCategory;
  /** Importance level of this event. */
  importance: EventImportance;

  /** Scope of this event (world, heya, or rikishi). */
  scope: EventScope;
  /** Heya ID if scope is heya. */
  heyaId?: Id;
  /** Rikishi ID if scope is rikishi. */
  rikishiId?: Id;

  // Content
  /** Title of the event. */
  title: string;
  /** Summary description of the event. */
  summary: string;

  // Data Payload
  /** Narrative context data for this event. */
  data: NarrativeContext;

  /** Truth level (visibility of this information). */
  truthLevel: "public" | "limited" | "private";
  /** Optional tags for filtering or categorization. */
  tags?: string[];
}

/**
 * Defines the structure for events state.
 * Container for all logged events in the world.
 */
export interface EventsState {
  /** Version identifier for data migration. */
  version: "1.0.0";
  /** Array of all logged events. */
  log: EngineEvent[];
  /** Deduplication map to prevent duplicate events. */
  dedupe: Record<string, true>;
}
