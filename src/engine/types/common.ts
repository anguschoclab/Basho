/**
 * Common utility types shared across all domains.
 */

export type Id = string;
export type IdMap<T> = Record<Id, T>;
export type IdMapRuntime<T> = Map<Id, T>;
