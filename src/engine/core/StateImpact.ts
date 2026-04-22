// @ts-nocheck
/**
 * StateImpact Types
 *
 * Defines the structure for state impact patches used in the Collector-Resolver pattern.
 * Simulation passes return StateImpact objects describing what should change,
 * and a resolver applies these patches atomically to produce the final state.
 */

import type { WorldState } from "../types/world";
import type { HeyaTrainingState } from "../types/training";
import type { Sponsor, Koenkai } from "../types/sponsors";
import type { BashoResult, MatchSchedule, AwardLogEntry } from "../types/basho";
import type { GovernanceRuling } from "../types/economy";
import type { AlmanacSnapshot } from "../almanac";
import type {
  EngineEventType,
  EventCategory,
  EventImportance,
  NarrativeContext,
} from "../types/events";

/**
 * A partial state patch describing changes to apply.
 * Simulation passes return StateImpact objects instead of mutating state directly.
 */
export interface StateImpact {
  /**
   * Entity updates - partial objects to merge into existing entities.
   * The resolver will shallow merge these partials with existing entities.
   */
  entities?: {
    /** Map of heya ID → partial heya update */
    heyaUpdates?: Map<string, Partial<Heya>>;
    /** Map of rikishi ID → partial rikishi update */
    rikishiUpdates?: Map<string, Partial<Rikishi>>;
    /** Map of oyakata ID → partial oyakata update */
    oyakataUpdates?: Map<string, Partial<Oyakata>>;
    /** Map of sponsor ID → partial sponsor update */
    sponsorUpdates?: Map<string, Partial<Sponsor>>;
    /** Map of koenkai ID → partial koenkai update */
    koenkaiUpdates?: Map<string, Partial<Koenkai>>;
    /** Map of heya ID → partial training state update */
    trainingStateUpdates?: Map<string, Partial<HeyaTrainingState>>;
    // Add other entity types as needed
  };

  /**
   * Collection operations (add/remove/move between collections).
   * Used for operations that modify entity collections rather than individual entities.
   */
  collections?: {
    /** Rikishi to add to active roster */
    rikishiToAdd?: Rikishi[];
    /** Rikishi IDs to remove from active roster (delete) */
    rikishiToRemove?: string[];
    /** Rikishi IDs to move from active to historical collection */
    rikishiToHistorical?: string[];
    /** Rikishi IDs to move from historical back to active */
    rikishiFromHistorical?: string[];
    // Add other collection operations as needed
  };

  /**
   * Entity deletions - IDs of entities to remove from the world.
   */
  deletedEntities?: {
    /** Heya IDs to delete */
    heyaIds?: string[];
    /** Oyakata IDs to delete */
    oyakataIds?: string[];
    /** Rikishi IDs to delete */
    rikishiIds?: string[];
  };

  /**
   * Top-level world field updates.
   * Used for scalar fields on WorldState that don't fit entity/collection patterns.
   */
  worldFields?: Partial<
    Pick<
      WorldState,
      | "year"
      | "week"
      | "dayIndexGlobal"
      | "cyclePhase"
      | "_postBashoMeta"
      | "_recruitmentWindow"
      | "closedHeyas"
      | "currentBasho"
      | "currentBashoName"
      | "ozekiKadoban"
      | "_interimDaysRemaining"
      | "_postBashoDays"
      | "calendar"
      | "history"
      | "almanacSnapshots"
      | "mediaState"
      | "ftue"
      | "rivalriesState"
      | "_preBashoAssessment"
      | "sponsorPool"
      | "myosekiMarket"
      | "_daysSinceLastWeeklyTick"
      | "governanceLog"
      | "pendingExhibitions"
      | "bloodlineRegistry"
      | "npcScoutingPriorities"
      | "talentPool"
      | "candidatePool"
    >
  >;

  /**
   * Array append operations for world arrays.
   * Used to append items to world arrays like history, almanacSnapshots, basho.matches, governanceLog.
   */
  arrayAppends?: Array<
    | { field: "history"; items: BashoResult[] }
    | { field: "almanacSnapshots"; items: AlmanacSnapshot[] }
    | { field: "basho.matches"; items: MatchSchedule[] }
    | { field: "governanceLog"; items: GovernanceRuling[] }
    | { field: "awardLog"; items: AwardLogEntry[] }
  >;

  /**
   * Events to log (deferred from EventBus calls).
   * Events are queued in impacts and applied atomically by the resolver.
   * This ensures events are part of the transaction and order is deterministic.
   */
  events?: Array<{
    type: EngineEventType;
    category: EventCategory;
    heyaId?: Id;
    rikishiId?: Id;
    data: NarrativeContext;
    importance?: EventImportance;
  }>;

  /**
   * Metadata about this impact.
   * Used for debugging, UI visualization, and impact tracking.
   */
  metadata?: {
    /** Source of this impact (e.g., "prestigeDecay", "governanceReview") */
    source: string;
    /** Optional timestamp for ordering/debugging */
    timestamp?: number;
    /** Optional additional metadata */
    [key: string]: unknown;
  };
}

/**
 * Type guard to check if an object is a valid StateImpact.
 */
export function isStateImpact(value: unknown): value is StateImpact {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const impact = value as Partial<StateImpact>;

  // At least one of the main fields should be present
  return !!(
    impact.entities ||
    impact.collections ||
    impact.deletedEntities ||
    impact.worldFields ||
    impact.events
  );
}

/**
 * Creates an empty StateImpact with optional metadata.
 * Always generates a timestamp for tracking.
 */
export function createEmptyImpact(metadata?: StateImpact["metadata"]): StateImpact {
  return {
    metadata: {
      ...metadata,
      source: metadata?.source || "unknown",
      timestamp: metadata?.timestamp ?? Date.now(),
    },
  };
}