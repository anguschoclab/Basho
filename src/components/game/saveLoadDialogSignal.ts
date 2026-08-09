const openListeners = new Set<() => void>();

export function openSaveLoadDialog() {
  openListeners.forEach((fn) => fn());
}

export { openListeners };
