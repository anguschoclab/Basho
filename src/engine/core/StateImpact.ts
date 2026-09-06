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
import type { Staff } from "../types/staff";
import type { BashoResult, MatchSchedule, AwardLogEntry } from "../types/basho";
import type { GovernanceRuling } from "../types/economy";
import type { MyosekiStock, MyosekiTransaction } from "../types/myoseki";
import type { AlmanacSnapshot } from "../almanac";
import type {
  EngineEventType,
  EventCategory,
  EventImportance,
  NarrativeContext,
} from "../types/events";
import type { Id } from "../types/common";
import type { Heya } from "../types/heya";
import type { Rikishi } from "../types/rikishi";
import type { RetiredRikishiSummary } from "../types/history";
import type { Oyakata } from "../types/oyakata";

/**
 * Create a fresh deterministic timestamp generator.
 * Each call returns a new closure with its own counter.
 */
function createTimestampGenerator(): () => number {
  let counter = 0;
  return () => ++counter;
}

/** Tick-scoped timestamp generator. Reset at simulation boundaries. */
let _timestampGen = createTimestampGenerator();

/**
 * Reset the impact timestamp generator.
 * Call this when starting a new simulation or loading a saved world to ensure
 * timestamps start from zero for deterministic behavior.
 *
 * @example
 * ```ts
 * resetImpactTimestampCounter();
 * const impact1 = createEmptyImpact({ source: "test" });
 * const impact2 = createEmptyImpact({ source: "test" });
 * // impact1.metadata.timestamp === 1
 * // impact2.metadata.timestamp === 2
 * ```
 */
export function resetImpactTimestampCounter(): void {
  _timestampGen = createTimestampGenerator();
}

/**
 * Get the next deterministic timestamp.
 * Used to order impacts deterministically across simulation runs.
 *
 * @returns {number} The next timestamp value.
 *
 * @example
 * ```ts
 * const ts1 = getNextTimestamp(); // 1
 * const ts2 = getNextTimestamp(); // 2
 * ```
 */
export function getNextTimestamp(): number {
  return _timestampGen();
}

/**
 * A partial state patch describing changes to apply.
 * Simulation passes return StateImpact objects instead of mutating state directly.
 *
 * CONTRACT:
 * - Determinism: Must be applied atomically by ImpactResolver.
 * - Immutability: Objects provided as partials (e.g., in entity updates or collections)
 *   must be deeply immutable; do not leak shared references into the patch.
 * - Idempotency: Impact fields should describe the absolute final state of the updated
 *   properties, not relative increments, as patches are merged sequentially.
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
    /** Map of myoseki ID → partial myoseki stock update */
    myosekiUpdates?: Map<string, Partial<MyosekiStock>>;
    /** Map of staff ID → partial staff update */
    staffUpdates?: Map<string, Partial<Staff>>;
    /** Map of historical rikishi ID → full replacement (RetiredRikishiSummary or full Rikishi) */
    historicalRikishiUpdates?: Map<string, RetiredRikishiSummary | Rikishi>;
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
    /** Rikishi IDs to add to activeRikishiIds set */
    activeRikishiIdsToAdd?: string[];
    /** Rikishi IDs to remove from activeRikishiIds set */
    activeRikishiIdsToRemove?: string[];
    /** Oyakata to add to the world */
    oyakataToAdd?: Oyakata[];
    /** Oyakata IDs to remove from the world (delete) */
    oyakataToRemove?: string[];
    /** Staff to add to active roster */
    staffToAdd?: Staff[];
    /** Staff IDs to remove from active roster (delete) */
    staffToRemove?: string[];
    /** Heyas to add to the world (stable founding) */
    heyaToAdd?: Heya[];
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
      | "sparringPairs"
      | "globalCup"
      | "chronicle"
      | "transientContext"
      | "events"
      | "pendingDecisions"
      | "pendingCrisis"
      | "lineage"
      | "matchmakingOverride"
      | "playerKnowledge"
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
    | { field: "myosekiMarket.history"; items: MyosekiTransaction[] }
    | { field: "pendingExhibitions"; items: unknown[] }
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
 * Verifies that the object has at least one of the required impact fields.
 *
 * @param {unknown} value - The value to check.
 * @returns {value is StateImpact} True if the value is a valid StateImpact.
 *
 * @example
 * ```ts
 * const impact = { entities: { rikishiUpdates: new Map() } };
 * if (isStateImpact(impact)) {
 *   // TypeScript knows impact is StateImpact
 *   console.log(impact.entities);
 * }
 * ```
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
 * Always generates a timestamp for tracking and ordering.
 *
 * @param {StateImpact["metadata"]} [metadata] - Optional metadata to include.
 * @returns {StateImpact} An empty StateImpact with the provided metadata.
 *
 * @example
 * ```ts
 * const impact = createEmptyImpact({ source: "trainingTick" });
 * // impact.metadata.source === "trainingTick"
 * // impact.metadata.timestamp === 1 (or next counter value)
 * ```
 */
export function createEmptyImpact(metadata?: StateImpact["metadata"]): StateImpact {
  return {
    metadata: {
      ...metadata,
      source: metadata?.source || "unknown",
      timestamp: metadata?.timestamp ?? getNextTimestamp(),
    },
  };
}
