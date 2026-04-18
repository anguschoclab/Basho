/**
 * baseProjections.ts
 *
 * Base projection utilities for transforming engine entities to UI DTOs.
 * Eliminates duplicate projection logic patterns.
 */

import type { Id } from "../../engine/types/common";

/**
 * Create a base projection with ID field.
 * @param entity - The entity to project
 * @returns Object with id field and partial entity data
 */
export function createBaseProjection<T extends { id: Id }>(entity: T): { id: Id } {
  return {
    id: entity.id,
  };
}

/**
 * Project an entity with default values applied.
 * @param entity - The entity to project
 * @param defaults - Default values to apply
 * @returns Entity with defaults applied
 */
export function projectWithDefaults<T, P extends Partial<T>>(entity: T, defaults: P): T & P {
  return {
    ...entity,
    ...defaults,
  };
}

/**
 * Create a projection that includes only specified fields.
 * @param entity - The entity to project
 * @param fields - Array of field names to include
 * @returns Object with only specified fields
 */
export function projectFields<T extends Record<string, unknown>, K extends keyof T>(
  entity: T,
  fields: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const field of fields) {
    result[field] = entity[field];
  }
  return result;
}

/**
 * Create a projection that excludes specified fields.
 * @param entity - The entity to project
 * @param fields - Array of field names to exclude
 * @returns Object without specified fields
 */
export function projectExcludeFields<T extends Record<string, unknown>, K extends keyof T>(
  entity: T,
  fields: K[]
): Omit<T, K> {
  const result = { ...entity };
  const fieldsSet = new Set(fields);
  const omitted = {} as Omit<T, K>;
  for (const key of Object.keys(result) as Array<keyof T>) {
    if (!fieldsSet.has(key as K)) {
      (omitted as Record<keyof T, unknown>)[key] = result[key];
    }
  }
  return omitted;
}

/**
 * Transform an array of entities using a projection function.
 * @param entities - Array of entities to project
 * @param projectionFn - Projection function to apply
 * @returns Array of projected entities
 */
export function projectArray<T, P>(entities: T[], projectionFn: (entity: T) => P): P[] {
  return entities.map(projectionFn);
}

/**
 * Create a projection that maps entity IDs to their projections.
 * @param entities - Map of ID to entity
 * @param projectionFn - Projection function to apply
 * @returns Map of ID to projected entity
 */
export function projectMap<T, P>(
  entities: Map<string, T>,
  projectionFn: (entity: T) => P
): Map<string, P> {
  const result = new Map<string, P>();
  for (const [id, entity] of entities.entries()) {
    result.set(id, projectionFn(entity));
  }
  return result;
}

/**
 * Create a conditional projection that applies different logic based on a predicate.
 * @param entity - The entity to project
 * @param predicate - Condition to check
 * @param trueProjection - Projection when predicate is true
 * @param falseProjection - Projection when predicate is false
 * @returns Projected entity based on condition
 */
export function projectConditional<T, P>(
  entity: T,
  predicate: (entity: T) => boolean,
  trueProjection: (entity: T) => P,
  falseProjection: (entity: T) => P
): P {
  return predicate(entity) ? trueProjection(entity) : falseProjection(entity);
}

/**
 * Create a projection that safely handles optional fields.
 * @param entity - The entity to project
 * @param field - Optional field to project
 * @param defaultValue - Default value if field is undefined
 * @returns Projected value or default
 */
export function projectOptionalField<T, K extends keyof T>(
  entity: T,
  field: K,
  defaultValue: T[K]
): T[K] {
  return entity[field] ?? defaultValue;
}

/**
 * Create a projection that transforms a nested field.
 * @param entity - The entity to project
 * @param fieldPath - Dot-separated path to nested field
 * @param transformFn - Transform function to apply
 * @returns Transformed nested value
 */
export function projectNestedField<T, P>(
  entity: T,
  fieldPath: string,
  transformFn: (value: unknown) => P
): P | undefined {
  const value = fieldPath.split(".").reduce((obj: unknown, key: string) => {
    return (obj as Record<string, unknown>)[key];
  }, entity);

  return value !== undefined ? transformFn(value) : undefined;
}
