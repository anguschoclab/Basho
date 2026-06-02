/**
 * Impact Builder
 *
 * Helper functions for constructing StateImpact objects.
 * Provides a fluent API for building impacts without manually constructing the structure.
 */

import type { Id } from "../types/common";
import type { Heya } from "../types/heya";
import type { Rikishi } from "../types/rikishi";
import type { Oyakata } from "../types/oyakata";
import type { WorldState } from "../types/world";
import type {
  EngineEventType,
  EventCategory,
  EventImportance,
  NarrativeContext,
} from "../types/events";
import type { HeyaTrainingState } from "../types/training";
import type { MyosekiStock, MyosekiTransaction } from "../types/myoseki";
import type { Staff } from "../types/staff";
import type { StateImpact } from "./StateImpact";
import { createEmptyImpact, getNextTimestamp } from "./StateImpact";

/**
 * Deep merge two objects, handling nested structures.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  if (!target || typeof target !== "object") return source;
  if (!source || typeof source !== "object") return source;

  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key])) {
        output[key] = deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        output[key] = source[key];
      }
    }
  }

  return output;
}

/**
 * Set a nested field value using a dot-separated path.
 */
function setNestedField(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.split(".");
  const result = { ...obj };
  let current = result as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    const currentValue = current[key];
    current[key] =
      typeof currentValue === "object" && currentValue !== null ? { ...currentValue } : {};
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Builder class for constructing StateImpact objects.
 * Provides a fluent API for building impacts.
 */
export class ImpactBuilder {
  private impact: StateImpact;
  private source: string;

  constructor(source: string) {
    this.source = source;
    this.impact = createEmptyImpact({
      source,
      timestamp: getNextTimestamp(),
    });
  }

  /**
   * Add a partial heya update to the impact.
   */
  updateHeya(id: string, update: Partial<Heya>): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.heyaUpdates) {
      this.impact.entities.heyaUpdates = new Map();
    }
    const existing = this.impact.entities.heyaUpdates.get(id);
    this.impact.entities.heyaUpdates.set(id, existing ? { ...existing, ...update } : update);
    return this;
  }

  /**
   * Add a partial rikishi update to the impact.
   */
  updateRikishi(id: string, update: Partial<Rikishi>): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.rikishiUpdates) {
      this.impact.entities.rikishiUpdates = new Map();
    }
    const existing = this.impact.entities.rikishiUpdates.get(id);
    this.impact.entities.rikishiUpdates.set(id, existing ? deepMerge(existing, update) : update);
    return this;
  }

  /**
   * Update a nested field in a rikishi (e.g., h2h[opponentId]).
   */
  updateRikishiNestedField(id: string, fieldPath: string, value: unknown): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.rikishiUpdates) {
      this.impact.entities.rikishiUpdates = new Map();
    }
    const existing = this.impact.entities.rikishiUpdates.get(id) || {};
    const updated = setNestedField(existing, fieldPath, value);
    this.impact.entities.rikishiUpdates.set(id, updated);
    return this;
  }

  /**
   * Add a partial oyakata update to the impact.
   */
  updateOyakata(id: string, update: Partial<Oyakata>): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.oyakataUpdates) {
      this.impact.entities.oyakataUpdates = new Map();
    }
    const existing = this.impact.entities.oyakataUpdates.get(id);
    this.impact.entities.oyakataUpdates.set(id, existing ? { ...existing, ...update } : update);
    return this;
  }

  /**
   * Add a partial sponsor update to the impact.
   */
  updateSponsor(id: string, update: Record<string, unknown>): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.sponsorUpdates) {
      this.impact.entities.sponsorUpdates = new Map();
    }
    const existing = this.impact.entities.sponsorUpdates.get(id);
    this.impact.entities.sponsorUpdates.set(id, existing ? { ...existing, ...update } : update);
    return this;
  }

  /**
   * Add a partial koenkai update to the impact.
   */
  updateKoenkai(id: string, update: Record<string, unknown>): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.koenkaiUpdates) {
      this.impact.entities.koenkaiUpdates = new Map();
    }
    const existing = this.impact.entities.koenkaiUpdates.get(id);
    this.impact.entities.koenkaiUpdates.set(id, existing ? { ...existing, ...update } : update);
    return this;
  }

  /**
   * Add a partial training state update to the impact.
   */
  updateTrainingState(id: string, update: Partial<HeyaTrainingState>): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.trainingStateUpdates) {
      this.impact.entities.trainingStateUpdates = new Map();
    }
    const existing = this.impact.entities.trainingStateUpdates.get(id);
    this.impact.entities.trainingStateUpdates.set(
      id,
      existing ? deepMerge(existing, update) : update
    );
    return this;
  }

  /**
   * Add a partial myoseki stock update to the impact.
   */
  updateMyosekiStock(id: string, update: Partial<MyosekiStock>): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.myosekiUpdates) {
      this.impact.entities.myosekiUpdates = new Map();
    }
    const existing = this.impact.entities.myosekiUpdates.get(id);
    this.impact.entities.myosekiUpdates.set(id, existing ? { ...existing, ...update } : update);
    return this;
  }

  /**
   * Record a myoseki transaction in the history.
   */
  recordMyosekiTransaction(transaction: MyosekiTransaction): ImpactBuilder {
    return this.appendToWorldArray("myosekiMarket.history", [transaction]);
  }

  /**
   * Add a partial staff update to the impact.
   */
  updateStaff(id: string, update: Partial<Staff>): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.staffUpdates) {
      this.impact.entities.staffUpdates = new Map();
    }
    const existing = this.impact.entities.staffUpdates.get(id);
    this.impact.entities.staffUpdates.set(id, existing ? { ...existing, ...update } : update);
    return this;
  }

  /**
   * Add a new staff member to the world.
   */
  addStaff(staff: Staff): ImpactBuilder {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.staffToAdd) {
      this.impact.collections.staffToAdd = [];
    }
    this.impact.collections.staffToAdd.push(staff);
    return this;
  }

  /**
   * Add a new oyakata member to the world.
   */
  addOyakata(oyakata: Oyakata): ImpactBuilder {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.oyakataToAdd) {
      this.impact.collections.oyakataToAdd = [];
    }
    this.impact.collections.oyakataToAdd.push(oyakata);
    return this;
  }

  /**
   * Remove an oyakata from the world.
   */
  removeOyakata(id: string): ImpactBuilder {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.oyakataToRemove) {
      this.impact.collections.oyakataToRemove = [];
    }
    this.impact.collections.oyakataToRemove.push(id);
    return this;
  }

  /**
   * Remove a staff member from the world.
   */
  removeStaff(id: string): ImpactBuilder {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.staffToRemove) {
      this.impact.collections.staffToRemove = [];
    }
    this.impact.collections.staffToRemove.push(id);
    return this;
  }

  /**
   * Update a nested field in a training state.
   */
  updateTrainingStateNestedField(id: string, fieldPath: string, value: unknown): ImpactBuilder {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    if (!this.impact.entities.trainingStateUpdates) {
      this.impact.entities.trainingStateUpdates = new Map();
    }
    const existing = this.impact.entities.trainingStateUpdates.get(id) || {};
    const updated = setNestedField(existing, fieldPath, value);
    this.impact.entities.trainingStateUpdates.set(id, updated);
    return this;
  }

  /**
   * Add a rikishi to the active roster.
   */
  addRikishi(rikishi: Rikishi): ImpactBuilder {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.rikishiToAdd) {
      this.impact.collections.rikishiToAdd = [];
    }
    this.impact.collections.rikishiToAdd.push(rikishi);

    // Track in activeRikishiIds
    if (!this.impact.collections.activeRikishiIdsToAdd) {
      this.impact.collections.activeRikishiIdsToAdd = [];
    }
    this.impact.collections.activeRikishiIdsToAdd.push(rikishi.id);

    return this;
  }

  /**
   * Remove a rikishi from the active roster.
   */
  removeRikishi(id: string): ImpactBuilder {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.rikishiToRemove) {
      this.impact.collections.rikishiToRemove = [];
    }
    this.impact.collections.rikishiToRemove.push(id);

    // Remove from activeRikishiIds
    if (!this.impact.collections.activeRikishiIdsToRemove) {
      this.impact.collections.activeRikishiIdsToRemove = [];
    }
    this.impact.collections.activeRikishiIdsToRemove.push(id);

    return this;
  }

  /**
   * Retire a rikishi: moves from active to historical and sets retirement metadata.
   */
  retireRikishi(id: string): ImpactBuilder {
    this.updateRikishi(id, {
      isRetired: true,
    });

    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.rikishiToHistorical) {
      this.impact.collections.rikishiToHistorical = [];
    }
    this.impact.collections.rikishiToHistorical.push(id);

    // Remove from activeRikishiIds
    if (!this.impact.collections.activeRikishiIdsToRemove) {
      this.impact.collections.activeRikishiIdsToRemove = [];
    }
    this.impact.collections.activeRikishiIdsToRemove.push(id);

    return this;
  }

  /**
   * Move a rikishi from historical back to active collection.
   */
  unretireRikishi(id: string): ImpactBuilder {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.rikishiFromHistorical) {
      this.impact.collections.rikishiFromHistorical = [];
    }
    this.impact.collections.rikishiFromHistorical.push(id);

    // Add back to activeRikishiIds
    if (!this.impact.collections.activeRikishiIdsToAdd) {
      this.impact.collections.activeRikishiIdsToAdd = [];
    }
    this.impact.collections.activeRikishiIdsToAdd.push(id);

    return this;
  }

  /**
   * Delete a heya from the world.
   */
  deleteHeya(id: string): ImpactBuilder {
    if (!this.impact.deletedEntities) {
      this.impact.deletedEntities = { heyaIds: [], oyakataIds: [], rikishiIds: [] };
    }
    if (!this.impact.deletedEntities.heyaIds) {
      this.impact.deletedEntities.heyaIds = [];
    }
    this.impact.deletedEntities.heyaIds.push(id);
    return this;
  }

  /**
   * Update a top-level world field.
   */
  updateWorldField<
    K extends keyof Pick<
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
      | "records"
      | "hallOfFame"
      | "staff"
      | "rikishi"
      | "oyakata"
      | "heyas"
      | "transientContext"
      | "settings"
      | "playerKnowledge"
      | "globalCup"
      | "chronicle"
    >,
  >(field: K, value: WorldState[K]): ImpactBuilder {
    if (!this.impact.worldFields) {
      this.impact.worldFields = {};
    }
    (this.impact.worldFields as Record<string, unknown>)[field] = value;
    return this;
  }

  /**
   * Append items to a world array field.
   * @param field - The world field array to append to (history, almanacSnapshots, basho.matches, governanceLog, pendingExhibitions)
   * @param items - Items to append
   */
  appendToWorldArray<
    K extends
      | "history"
      | "almanacSnapshots"
      | "basho.matches"
      | "governanceLog"
      | "awardLog"
      | "myosekiMarket.history"
      | "pendingExhibitions",
  >(field: K, items: unknown[]): ImpactBuilder {
    if (!this.impact.arrayAppends) {
      this.impact.arrayAppends = [];
    }
    this.impact.arrayAppends.push({ field, items } as never);
    return this;
  }

  /**
   * Queue an event to be logged.
   */
  logEvent(
    type: EngineEventType,
    category: EventCategory,
    data: NarrativeContext,
    options?: {
      heyaId?: Id;
      rikishiId?: Id;
      importance?: EventImportance;
    }
  ): ImpactBuilder {
    if (!this.impact.events) {
      this.impact.events = [];
    }
    this.impact.events.push({
      type,
      category,
      data,
      heyaId: options?.heyaId,
      rikishiId: options?.rikishiId,
      importance: options?.importance,
    });
    return this;
  }

  /**
   * Add custom metadata to the impact.
   */
  addMetadata(key: string, value: unknown): ImpactBuilder {
    if (!this.impact.metadata) {
      this.impact.metadata = {
        source: this.source,
        timestamp: getNextTimestamp(),
      };
    }
    (this.impact.metadata as Record<string, unknown>)[key] = value;
    return this;
  }

  /**
   * Merge another StateImpact into this builder's accumulator.
   * Useful for composing sub-system impacts without a separate mergeImpacts call.
   */
  merge(other: StateImpact): ImpactBuilder {
    if (other.entities?.heyaUpdates) {
      for (const [id, update] of other.entities.heyaUpdates) {
        this.updateHeya(id, update as Partial<Heya>);
      }
    }
    if (other.entities?.rikishiUpdates) {
      for (const [id, update] of other.entities.rikishiUpdates) {
        this.updateRikishi(id, update as Partial<Rikishi>);
      }
    }
    if (other.entities?.oyakataUpdates) {
      for (const [id, update] of other.entities.oyakataUpdates) {
        this.updateOyakata(id, update as Partial<Oyakata>);
      }
    }
    if (other.entities?.sponsorUpdates) {
      for (const [id, update] of other.entities.sponsorUpdates) {
        this.updateSponsor(id, update as Record<string, unknown>);
      }
    }
    if (other.entities?.koenkaiUpdates) {
      for (const [id, update] of other.entities.koenkaiUpdates) {
        this.updateKoenkai(id, update as Record<string, unknown>);
      }
    }
    if (other.entities?.trainingStateUpdates) {
      for (const [id, update] of other.entities.trainingStateUpdates) {
        this.updateTrainingState(id, update as Partial<HeyaTrainingState>);
      }
    }
    if (other.entities?.myosekiUpdates) {
      for (const [id, update] of other.entities.myosekiUpdates) {
        this.updateMyosekiStock(id, update as Partial<MyosekiStock>);
      }
    }
    if (other.entities?.staffUpdates) {
      for (const [id, update] of other.entities.staffUpdates) {
        this.updateStaff(id, update as Partial<Staff>);
      }
    }
    if (other.collections?.rikishiToAdd) {
      for (const r of other.collections.rikishiToAdd) {
        this.addRikishi(r);
      }
    }
    if (other.collections?.rikishiToRemove) {
      for (const id of other.collections.rikishiToRemove) {
        this.removeRikishi(id);
      }
    }
    if (other.collections?.rikishiToHistorical) {
      for (const id of other.collections.rikishiToHistorical) {
        this.retireRikishi(id);
      }
    }
    if (other.collections?.rikishiFromHistorical) {
      for (const id of other.collections.rikishiFromHistorical) {
        this.unretireRikishi(id);
      }
    }
    if (other.deletedEntities?.heyaIds) {
      for (const id of other.deletedEntities.heyaIds) {
        this.deleteHeya(id);
      }
    }
    if (other.worldFields) {
      if (!this.impact.worldFields) this.impact.worldFields = {};
      Object.assign(this.impact.worldFields, other.worldFields);
    }
    if (other.arrayAppends) {
      for (const append of other.arrayAppends) {
        this.appendToWorldArray(
          append.field as Parameters<ImpactBuilder["appendToWorldArray"]>[0],
          append.items
        );
      }
    }
    if (other.events) {
      for (const ev of other.events) {
        this.logEvent(ev.type, ev.category, ev.data, {
          heyaId: ev.heyaId,
          rikishiId: ev.rikishiId,
          importance: ev.importance,
        });
      }
    }
    return this;
  }

  /**
   * Build and return the StateImpact.
   */
  build(): StateImpact {
    return this.impact;
  }
}

/**
 * Create a new ImpactBuilder with the specified source.
 */
export function createImpactBuilder(source: string): ImpactBuilder {
  return new ImpactBuilder(source);
}

/**
 * Convenience function to create a simple heya update impact.
 */
export function updateHeyaImpact(id: string, update: Partial<Heya>, source: string): StateImpact {
  return createImpactBuilder(source).updateHeya(id, update).build();
}

/**
 * Convenience function to create a simple rikishi update impact.
 */
export function updateRikishiImpact(
  id: string,
  update: Partial<Rikishi>,
  source: string
): StateImpact {
  return createImpactBuilder(source).updateRikishi(id, update).build();
}

/**
 * Convenience function to create a retirement impact.
 */
export function retireRikishiImpact(
  id: string,
  source: string
): StateImpact {
  return createImpactBuilder(source).retireRikishi(id).build();
}

/**
 * Convenience function to create an event logging impact.
 */
export function logEventImpact(
  type: EngineEventType,
  category: EventCategory,
  data: NarrativeContext,
  source: string,
  options?: {
    heyaId?: Id;
    rikishiId?: Id;
    importance?: EventImportance;
  }
): StateImpact {
  return createImpactBuilder(source).logEvent(type, category, data, options).build();
}

/**
 * Convenience function to create a world field update impact.
 */
export function updateWorldFieldImpact<
  K extends keyof Pick<
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
    | "sponsorPool"
    | "myosekiMarket"
    | "_daysSinceLastWeeklyTick"
    | "governanceLog"
    | "pendingExhibitions"
    | "bloodlineRegistry"
    | "npcScoutingPriorities"
    | "talentPool"
    | "candidatePool"
    | "records"
    | "hallOfFame"
    | "staff"
    | "rikishi"
    | "oyakata"
    | "heyas"
    | "transientContext"
    | "settings"
    | "globalCup"
    | "chronicle"
  >,
>(field: K, value: WorldState[K], source: string): StateImpact {
  return createImpactBuilder(source).updateWorldField(field, value).build();
}
