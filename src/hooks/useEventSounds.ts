import { useEffect, useRef } from "react";
import { useGame } from "@/state/game/useGame";
import { playForEvent } from "@/lib/audio";

/**
 * Plays a synthesized tone when a new engine event lands on the world log.
 * Skips the initial render so loading a save doesn't chirp.
 */
export function useEventSounds(): void {
  const { state } = useGame();
  const last = state.world?.events?.log?.at(-1);
  const seenRef = useRef<string | undefined>(undefined);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      seenRef.current = last?.id;
      return;
    }
    if (!last || last.id === seenRef.current) return;
    seenRef.current = last.id;
    playForEvent(last);
  }, [last]);
}
