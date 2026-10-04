import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";

export function useRequireWorld(redirectTo: string = "/main-menu"): boolean {
  const { state, hasAutosave, loadFromAutosave } = useGame();
  const workerWorld = useGameStore((s) => s.workerWorld);
  const navigate = useNavigate();
  const world = state.world;
  const restoreAttempted = useRef(false);

  useEffect(() => {
    // workerWorld leads state.world — a WORLD_UPDATED may be in transit. Never
    // restore or redirect while it is, or we'd clobber the incoming world (B30).
    if (world || workerWorld) return;
    if (restoreAttempted.current) {
      // A restore dispatch is already in flight; wait for it to land. If there
      // is genuinely nothing to restore, fall through to the menu.
      if (!hasAutosave()) navigate({ to: redirectTo, replace: true });
      return;
    }
    restoreAttempted.current = true;
    // Cold boot on a game route (reload/deep link): restore the autosave in
    // place instead of bouncing to the menu and losing the player's location.
    if (!(hasAutosave() && loadFromAutosave())) {
      navigate({ to: redirectTo, replace: true });
    }
  }, [world, workerWorld, hasAutosave, loadFromAutosave, navigate, redirectTo]);

  return !!world;
}
