import { useEffect, useState } from "react";
import { BardEngine } from "@/engine/bard/BardEngine";

/**
 * Returns `true` once all BardEngine narrative domains have been loaded.
 * On first render, checks synchronously via `areDomainsLoaded()`.
 * If not yet loaded, subscribes to the cached `loadDomains()` promise and
 * flips to `true` when it resolves. On rejection, stays `false` (graceful
 * degradation — callers render fallback content, never crash).
 */
export function useDomainsReady(): boolean {
  const [ready, setReady] = useState(() => BardEngine.areDomainsLoaded());

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    BardEngine.loadDomains()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        // Graceful degradation: stay false, narrative resolves to empty strings
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready;
}
