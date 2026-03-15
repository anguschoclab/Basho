/**
 * Common utility types shared across all domains.
 */

export type Id = string;
/** Type representing id map. */
export type IdMap<T> = Record<Id, T>;
/** Type representing id map runtime. */
export type IdMapRuntime<T> = Map<Id, T>;
