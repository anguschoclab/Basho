import { useState, useCallback } from "react";
import type { SortDirection } from "@/lib/sortUtils";

interface StoredSortState {
  key: string;
  order: SortDirection;
}

/**
 * Persistent sort state hook.
 * Stores `{ key, order }` as JSON in localStorage under `storageKey`.
 * Falls back to defaults when storage is unavailable or corrupt.
 */
export function useSortState<TKey extends string>(
  storageKey: string,
  defaultKey: TKey,
  defaultOrder: SortDirection,
  initialOrder?: SortDirection
): {
  sortKey: TKey;
  sortOrder: SortDirection;
  setSortKey: (key: TKey) => void;
  toggleOrder: () => void;
} {
  const initialSortOrder = initialOrder ?? defaultOrder;
  const [state, setState] = useState<{ key: TKey; order: SortDirection }>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredSortState;
        return { key: parsed.key as TKey, order: parsed.order };
      }
    } catch {
      // fall through to defaults
    }
    return { key: defaultKey, order: initialSortOrder };
  });

  const persist = useCallback(
    (key: TKey, order: SortDirection) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ key, order }));
      } catch {
        // ignore storage errors
      }
    },
    [storageKey]
  );

  const setSortKey = useCallback(
    (key: TKey) => {
      setState(() => {
        persist(key, defaultOrder);
        return { key, order: defaultOrder };
      });
    },
    [defaultOrder, persist]
  );

  const toggleOrder = useCallback(() => {
    setState((prev) => {
      const nextOrder: SortDirection = prev.order === "asc" ? "desc" : "asc";
      persist(prev.key, nextOrder);
      return { key: prev.key, order: nextOrder };
    });
  }, [persist]);

  return {
    sortKey: state.key,
    sortOrder: state.order,
    setSortKey,
    toggleOrder,
  };
}
