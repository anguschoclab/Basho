/**
 * src/engine/utils/collections.ts
 * ================================
 * Allocation-free collection builders.
 *
 * `new Map(list.map(fn))` allocates an intermediate entry array that is
 * immediately discarded; these helpers populate the map in a single pass.
 */

/**
 * Builds a Map keyed by `item.id` without an intermediate entry array.
 * Duplicate ids: last write wins (identical to `new Map` semantics).
 */
export function toIdMap<T extends { id: string }>(list: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of list) map.set(item.id, item);
  return map;
}

/**
 * Builds a Map keyed by `keyOf(item)` without an intermediate entry array.
 * `valueOf` optionally transforms the stored value; omitting it stores the item.
 * Duplicate keys: last write wins (identical to `new Map` semantics).
 */
export function toKeyedMap<T, K, V = T>(
  list: readonly T[],
  keyOf: (item: T, index: number) => K,
  valueOf?: (item: T, index: number) => V
): Map<K, V> {
  const map = new Map<K, V>();
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    map.set(keyOf(item, i), (valueOf ? valueOf(item, i) : item) as V);
  }
  return map;
}
