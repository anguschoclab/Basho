// Minimal store hook for UI components
import { useSyncExternalStore, useCallback } from 'react';

type StoreState = {
  initialized: boolean;
  calendar?: { year: number; weekOfYear: number };
  playerStable?: { name: string };
  warriors?: Record<string, any>;
  fights?: Record<string, any>;
  news?: any[];
};

let state: StoreState = { initialized: false };
const listeners = new Set<() => void>();

function getSnapshot(): StoreState {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStore(partial: Partial<StoreState>) {
  state = { ...state, ...partial };
  listeners.forEach(l => l());
}

export function useStore<T>(selector: (s: StoreState) => T): T {
  const getSnapshotWithSelector = useCallback(() => selector(getSnapshot()), [selector]);
  return useSyncExternalStore(subscribe, getSnapshotWithSelector, getSnapshotWithSelector);
}

// Initialize from globalThis if available
if ((globalThis as any).__dmSave) {
  const Save = (globalThis as any).__dmSave;
  setStore({
    initialized: true,
    calendar: Save?.getCalendar?.() ?? { year: 1, weekOfYear: 1 },
    warriors: Save?.getWarriors?.() ?? {},
    fights: Save?.getFights?.() ?? {},
    news: Save?.getNews?.() ?? [],
  });
}
