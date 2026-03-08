// useAutosaveIndicator.ts — Listens for autosave events and exposes a transient status
import { useState, useEffect, useCallback } from "react";

type AutosaveStatus = "idle" | "saving" | "done";

// Simple global event bus for autosave signals
const listeners = new Set<(status: AutosaveStatus) => void>();

export function signalAutosave(status: AutosaveStatus) {
  listeners.forEach((fn) => fn(status));
}

export function useAutosaveIndicator() {
  const [status, setStatus] = useState<AutosaveStatus>("idle");

  useEffect(() => {
    const handler = (s: AutosaveStatus) => setStatus(s);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return status;
}
