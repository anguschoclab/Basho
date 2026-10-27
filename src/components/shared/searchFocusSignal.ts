/**
 * searchFocusSignal.ts
 *
 * Cross-component focus signal for the global entity search input, mirroring
 * saveLoadDialogSignal. The keyboard-shortcut hook fires focusGlobalSearch();
 * GlobalEntitySearch subscribes via onFocusGlobalSearch() to focus its input.
 */

const focusListeners = new Set<() => void>();

export function focusGlobalSearch() {
  focusListeners.forEach((fn) => fn());
}

export function onFocusGlobalSearch(fn: () => void): () => void {
  focusListeners.add(fn);
  return () => {
    focusListeners.delete(fn);
  };
}
