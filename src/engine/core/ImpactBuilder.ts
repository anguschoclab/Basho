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
import { DEFAULT_START_YEAR } from "../../constants/engine/calendar";
import type { Staff } from "../types/staff";
import type { StateImpact } from "./StateImpact";
import { createEmptyImpact, getNextTimestamp } from "./StateImpact";
import { deepMerge, setNestedField } from "../utils/objectMerge";

type ArrayAppendItem<K extends string> = K extends "history"
  ? import("../types/basho").BashoResult[]
  : K extends "almanacSnapshots"
    ? import("../almanac/types").AlmanacSnapshot[]
    : K extends "basho.matches"
      ? import("../types/basho").MatchSchedule[]
      : K extends "governanceLog"
        ? import("../types/economy").GovernanceRuling[]
        : K extends "awardLog"
          ? import("../types/basho").AwardLogEntry[]
          : K extends "myosekiMarket.history"
            ? MyosekiTransaction[]
            : K extends "pendingExhibitions"
              ? unknown[]
              : never;

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

  // ── Private helpers ─────────────────────────────────────────────────────────

  private ensureEntityMap<T>(field: string): Map<string, T> {
    if (!this.impact.entities) {
      this.impact.entities = {};
    }
    const entities = this.impact.entities as Record<string, unknown>;
    if (!entities[field]) {
      entities[field] = new Map<string, T>();
    }
    return entities[field] as Map<string, T>;
  }

  private ensureCollectionArray(field: string): unknown[] {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    const collections = this.impact.collections as Record<string, unknown>;
    if (!collections[field]) {
      collections[field] = [];
    }
    return collections[field] as unknown[];
  }

  private ensureDeletedArray(field: string): string[] {
    if (!this.impact.deletedEntities) {
      this.impact.deletedEntities = { heyaIds: [], oyakataIds: [], rikishiIds: [] };
    }
    const deletions = this.impact.deletedEntities as Record<string, unknown>;
    if (!deletions[field]) {
      deletions[field] = [];
    }
    return deletions[field] as string[];
  }

  private setEntityUpdate<T>(
    field: string,
    id: string,
    update: Partial<T>,
    useDeepMerge = false
  ): ImpactBuilder {
    const map = this.ensureEntityMap<Partial<T>>(field);
    const existing = map.get(id);
    const merged = existing
      ? useDeepMerge
        ? (deepMerge(existing as Record<string, unknown>, update as Record<string, unknown>) as T)
        : { ...existing, ...update }
      : update;
    map.set(id, merged as Partial<T>);
    return this;
  }

  private setNestedEntityUpdate<T extends Record<string, unknown>>(
    field: string,
    id: string,
    fieldPath: string,
    value: unknown
  ): ImpactBuilder {
    const map = this.ensureEntityMap<T>(field);
    const existing = map.get(id) || ({} as T);
    const updated = setNestedField(existing, fieldPath, value);
    map.set(id, updated as T);
    return this;
  }

  /**
   * Add a partial heya update to the impact.
   */
  updateHeya(id: string, update: Partial<Heya>): ImpactBuilder {
    return this.setEntityUpdate("heyaUpdates", id, update);
  }

  /**
   * Add a partial rikishi update to the impact.
   */
  updateRikishi(id: string, update: Partial<Rikishi>): ImpactBuilder {
    return this.setEntityUpdate("rikishiUpdates", id, update, true);
  }

  /**
   * Update a nested field in a rikishi (e.g., h2h[opponentId]).
   */
  updateRikishiNestedField(id: string, fieldPath: string, value: unknown): ImpactBuilder {
    return this.setNestedEntityUpdate("rikishiUpdates", id, fieldPath, value);
  }

  /**
   * Add a partial oyakata update to the impact.
   */
  updateOyakata(id: string, update: Partial<Oyakata>): ImpactBuilder {
    return this.setEntityUpdate("oyakataUpdates", id, update);
  }

  /**
   * Add a partial sponsor update to the impact.
   */
  updateSponsor(id: string, update: Record<string, unknown>): ImpactBuilder {
    return this.setEntityUpdate("sponsorUpdates", id, update);
  }

  /**
   * Add a partial koenkai update to the impact.
   */
  updateKoenkai(id: string, update: Record<string, unknown>): ImpactBuilder {
    return this.setEntityUpdate("koenkaiUpdates", id, update);
  }

  /**
   * Add a partial training state update to the impact.
   */
  updateTrainingState(id: string, update: Partial<HeyaTrainingState>): ImpactBuilder {
    return this.setEntityUpdate("trainingStateUpdates", id, update, true);
  }

  /**
   * Add a partial myoseki stock update to the impact.
   */
  updateMyosekiStock(id: string, update: Partial<MyosekiStock>): ImpactBuilder {
    return this.setEntityUpdate("myosekiUpdates", id, update);
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
    return this.setEntityUpdate("staffUpdates", id, update);
  }

  /**
   * Add a new staff member to the world.
   */
  addStaff(staff: Staff): ImpactBuilder {
    (this.ensureCollectionArray("staffToAdd") as Staff[]).push(staff);
    return this;
  }

  /**
   * Add a new oyakata member to the world.
   */
  addOyakata(oyakata: Oyakata): ImpactBuilder {
    (this.ensureCollectionArray("oyakataToAdd") as Oyakata[]).push(oyakata);
    return this;
  }

  /**
   * Add a new heya to the world (stable founding).
   */
  addHeya(heya: Heya): ImpactBuilder {
    (this.ensureCollectionArray("heyaToAdd") as Heya[]).push(heya);
    return this;
  }

  /**
   * Remove an oyakata from the world.
   */
  removeOyakata(id: string): ImpactBuilder {
    (this.ensureCollectionArray("oyakataToRemove") as string[]).push(id);
    return this;
  }

  /**
   * Remove a staff member from the world.
   */
  removeStaff(id: string): ImpactBuilder {
    (this.ensureCollectionArray("staffToRemove") as string[]).push(id);
    return this;
  }

  /**
   * Update a nested field in a training state.
   */
  updateTrainingStateNestedField(id: string, fieldPath: string, value: unknown): ImpactBuilder {
    return this.setNestedEntityUpdate("trainingStateUpdates", id, fieldPath, value);
  }

  /**
   * Add a rikishi to the active roster.
   */
  addRikishi(rikishi: Rikishi): ImpactBuilder {
    (this.ensureCollectionArray("rikishiToAdd") as Rikishi[]).push(rikishi);
    (this.ensureCollectionArray("activeRikishiIdsToAdd") as string[]).push(rikishi.id);
    return this;
  }

  /**
   * Remove a rikishi from the active roster.
   */
  removeRikishi(id: string): ImpactBuilder {
    (this.ensureCollectionArray("rikishiToRemove") as string[]).push(id);
    (this.ensureCollectionArray("activeRikishiIdsToRemove") as string[]).push(id);
    return this;
  }

  /**
   * Retire a rikishi: moves from active to historical and sets retirement metadata.
   */
  retireRikishi(id: string, year: number = DEFAULT_START_YEAR, reason: string = "Retirement"): ImpactBuilder {
    this.updateRikishi(id, {
      isRetired: true,
      retirementYear: year,
      retirementReason: reason,
    });
    (this.ensureCollectionArray("rikishiToHistorical") as string[]).push(id);
    (this.ensureCollectionArray("activeRikishiIdsToRemove") as string[]).push(id);
    return this;
  }

  /**
   * Move a rikishi from historical back to active collection.
   */
  unretireRikishi(id: string): ImpactBuilder {
    (this.ensureCollectionArray("rikishiFromHistorical") as string[]).push(id);
    (this.ensureCollectionArray("activeRikishiIdsToAdd") as string[]).push(id);
    return this;
  }

  /**
   * Delete a heya from the world.
   */
  deleteHeya(id: string): ImpactBuilder {
    this.ensureDeletedArray("heyaIds").push(id);
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
      | "awardLog"
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
      | "globalKimariteStats"
      | "meta"
      | "pendingCrisis"
      | "pendingDecisions"
      | "yokozunaVacancyStreak"
      | "events"
      | "lineage"
      | "encouragementLog"
      | "matchmakingOverride"
      | "tutorialState"
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
      | "awardLog"
      | "almanacSnapshots"
      | "basho.matches"
      | "governanceLog"
      | "awardLog"
      | "myosekiMarket.history"
      | "pendingExhibitions",
  >(field: K, items: ArrayAppendItem<K>): ImpactBuilder {
    if (!this.impact.arrayAppends) {
      this.impact.arrayAppends = [];
    }
    (this.impact.arrayAppends as Array<{ field: string; items: unknown[] }>).push({ field, items });
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
    // Merge entity updates via Map-based dispatch (avoids iterating all 8 keys)
    if (other.entities) {
      for (const key in other.entities) {
        if (!Object.prototype.hasOwnProperty.call(other.entities, key)) continue;
        const map = other.entities[key as keyof typeof other.entities];
        if (!map || (map as Map<string, unknown>).size === 0) continue;
        switch (key) {
          case "heyaUpdates":
            for (const [id, update] of map as Map<string, unknown>) {
              this.updateHeya(id, update as Partial<Heya>);
            }
            break;
          case "rikishiUpdates":
            for (const [id, update] of map as Map<string, unknown>) {
              this.updateRikishi(id, update as Partial<Rikishi>);
            }
            break;
          case "oyakataUpdates":
            for (const [id, update] of map as Map<string, unknown>) {
              this.updateOyakata(id, update as Partial<Oyakata>);
            }
            break;
          case "sponsorUpdates":
            for (const [id, update] of map as Map<string, unknown>) {
              this.updateSponsor(id, update as Record<string, unknown>);
            }
            break;
          case "koenkaiUpdates":
            for (const [id, update] of map as Map<string, unknown>) {
              this.updateKoenkai(id, update as Record<string, unknown>);
            }
            break;
          case "trainingStateUpdates":
            for (const [id, update] of map as Map<string, unknown>) {
              this.updateTrainingState(id, update as Partial<HeyaTrainingState>);
            }
            break;
          case "myosekiUpdates":
            for (const [id, update] of map as Map<string, unknown>) {
              this.updateMyosekiStock(id, update as Partial<MyosekiStock>);
            }
            break;
          case "staffUpdates":
            for (const [id, update] of map as Map<string, unknown>) {
              this.updateStaff(id, update as Partial<Staff>);
            }
            break;
        }
      }
    }

    // Merge collections via Map-based dispatch
    if (other.collections) {
      for (const key in other.collections) {
        if (!Object.prototype.hasOwnProperty.call(other.collections, key)) continue;
        const arr = other.collections[key as keyof typeof other.collections];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        switch (key) {
          case "rikishiToAdd":
            for (const r of arr) this.addRikishi(r as Rikishi);
            break;
          case "rikishiToRemove":
            for (const id of arr) this.removeRikishi(id as string);
            break;
          case "rikishiToHistorical":
            (this.ensureCollectionArray("rikishiToHistorical") as string[]).push(
              ...(arr as string[])
            );
            break;
          case "rikishiFromHistorical":
            for (const id of arr) this.unretireRikishi(id as string);
            break;
          default:
            (this.ensureCollectionArray(key) as unknown[]).push(...arr);
        }
      }
    }

    // Merge deletions
    if (other.deletedEntities) {
      for (const key in other.deletedEntities) {
        if (!Object.prototype.hasOwnProperty.call(other.deletedEntities, key)) continue;
        const ids = other.deletedEntities[key as keyof typeof other.deletedEntities];
        if (Array.isArray(ids) && ids.length > 0) {
          this.ensureDeletedArray(key).push(...ids);
        }
      }
    }

    // Merge world fields
    if (other.worldFields) {
      if (!this.impact.worldFields) this.impact.worldFields = {};
      Object.assign(this.impact.worldFields, other.worldFields);
    }

    // Merge array appends
    if (other.arrayAppends) {
      for (const append of other.arrayAppends) {
        this.appendToWorldArray(
          append.field as Parameters<ImpactBuilder["appendToWorldArray"]>[0],
          append.items
        );
      }
    }

    // Merge events
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
 * Supports both signatures:
 *   retireRikishiImpact(id, source)
 *   retireRikishiImpact(id, year, reason, source)
 */
export function retireRikishiImpact(id: string, source: string): StateImpact;
export function retireRikishiImpact(
  id: string,
  year: number,
  reason: string,
  source: string
): StateImpact;
export function retireRikishiImpact(
  id: string,
  arg2: string | number,
  arg3?: string,
  arg4?: string
): StateImpact {
  if (typeof arg2 === "number") {
    return createImpactBuilder(arg4 ?? "retireRikishi").retireRikishi(id, arg2, arg3 ?? "").build();
  }
  return createImpactBuilder(arg2).retireRikishi(id).build();
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
    | "globalKimariteStats"
    | "meta"
    | "yokozunaVacancyStreak"
    | "lineage"
    | "encouragementLog"
    | "matchmakingOverride"
    | "tutorialState"
  >,
>(field: K, value: WorldState[K], source: string): StateImpact {
  return createImpactBuilder(source).updateWorldField(field, value).build();
}
