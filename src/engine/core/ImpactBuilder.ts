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
import type { StateImpact } from "./StateImpact";
import { createEmptyImpact } from "./StateImpact";

/**
 * Builder class for constructing StateImpact objects.
 * Provides a fluent API for building impacts.
 */
export class ImpactBuilder {
  private impact: StateImpact;

  constructor(source: string) {
    this.impact = createEmptyImpact({
      source,
      timestamp: Date.now(),
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
    this.impact.entities.heyaUpdates.set(
      id,
      existing ? { ...existing, ...update } : update
    );
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
    this.impact.entities.rikishiUpdates.set(
      id,
      existing ? { ...existing, ...update } : update
    );
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
    this.impact.entities.oyakataUpdates.set(
      id,
      existing ? { ...existing, ...update } : update
    );
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
    return this;
  }

  /**
   * Move a rikishi from active to historical collection (retirement).
   */
  retireRikishi(id: string): ImpactBuilder {
    if (!this.impact.collections) {
      this.impact.collections = {};
    }
    if (!this.impact.collections.rikishiToHistorical) {
      this.impact.collections.rikishiToHistorical = [];
    }
    this.impact.collections.rikishiToHistorical.push(id);
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
    return this;
  }

  /**
   * Update a top-level world field.
   */
  updateWorldField<K extends keyof Pick<WorldState, 
    | 'year' 
    | 'week' 
    | 'cyclePhase' 
    | '_postBashoMeta' 
    | '_recruitmentWindow'
  >>(
    field: K,
    value: WorldState[K]
  ): ImpactBuilder {
    if (!this.impact.worldFields) {
      this.impact.worldFields = {};
    }
    (this.impact.worldFields as any)[field] = value;
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
  addMetadata(key: string, value: any): ImpactBuilder {
    if (!this.impact.metadata) {
      this.impact.metadata = { source: 'unknown' };
    }
    (this.impact.metadata as any)[key] = value;
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
export function updateHeyaImpact(
  id: string,
  update: Partial<Heya>,
  source: string
): StateImpact {
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
export function retireRikishiImpact(id: string, source: string): StateImpact {
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
  return createImpactBuilder(source)
    .logEvent(type, category, data, options)
    .build();
}

/**
 * Convenience function to create a world field update impact.
 */
export function updateWorldFieldImpact<K extends keyof Pick<WorldState, 
  | 'year' 
  | 'week' 
  | 'cyclePhase' 
  | '_postBashoMeta' 
  | '_recruitmentWindow'
>>(
  field: K,
  value: WorldState[K],
  source: string
): StateImpact {
  return createImpactBuilder(source).updateWorldField(field, value).build();
}
