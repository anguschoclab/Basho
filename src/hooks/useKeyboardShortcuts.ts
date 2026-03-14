// useKeyboardShortcuts.ts — Global keyboard shortcuts for game navigation & actions
// Space = advance time, E = toggle event log, number keys = quick nav, etc.

import { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";

/** Defines the structure for shortcut options. */
interface ShortcutOptions {
  eventLogOpen: boolean;
  onToggleEventLog: () => void;
  onOpenSaveLoad?: () => void;
}

/** List of routes for number-key quick nav (1-9) */
const QUICK_NAV: Record<string, string> = {
  "1": "/dashboard",
  "2": "/basho",
  "3": "/banzuke",
  "4": "/stable",
  "5": "/rikishi",
  "6": "/training",
  "7": "/economy",
  "8": "/scouting",
  "9": "/rivalries",
};

/**
 * Use keyboard shortcuts.
 *  * @param { eventLogOpen, onToggleEventLog, onOpenSaveLoad } - The { event log open, on toggle event log, on open save load }.
 */
export function useKeyboardShortcuts({ eventLogOpen, onToggleEventLog, onOpenSaveLoad }: ShortcutOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, advanceOneDay, advanceDay, simulateBout, simulateAllBouts, endBasho, startBasho, quickSave } = useGame();
  const world = state.world;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // ── Ctrl+S: Quick save ──
      if (key === "s" && ctrl && !e.shiftKey) {
        e.preventDefault();
        if (world) quickSave();
        return;
      }

      // ── Ctrl+Shift+S: Open save/load dialog ──
      if (key === "s" && ctrl && e.shiftKey) {
        e.preventDefault();
        onOpenSaveLoad?.();
        return;
      }

      // ── SPACE: Advance time ──
      if (e.key === " " && !ctrl) {
        e.preventDefault();
        if (!world) return;

        if (world.cyclePhase === "active_basho") {
          if (location.pathname === "/basho") {
            simulateAllBouts();
          } else {
            advanceDay();
          }
        } else {
          advanceOneDay();
        }
        return;
      }

      // ── E: Toggle event log ──
      if (key === "e" && !ctrl) {
        e.preventDefault();
        onToggleEventLog();
        return;
      }

      // ── Number keys 1-9: Quick navigation ──
      if (!ctrl && !e.shiftKey && !e.altKey && QUICK_NAV[e.key]) {
        e.preventDefault();
        navigate(QUICK_NAV[e.key]);
        return;
      }

      // ── N: Simulate next bout (on Basho page) ──
      if (key === "n" && !ctrl && location.pathname === "/basho") {
        e.preventDefault();
        simulateBout(state.currentBoutIndex);
        return;
      }

      // ── A: Simulate all bouts (on Basho page) ──
      if (key === "a" && !ctrl && location.pathname === "/basho") {
        e.preventDefault();
        simulateAllBouts();
        return;
      }
    },
    [world, state, location.pathname, navigate, advanceOneDay, advanceDay, simulateBout, simulateAllBouts, onToggleEventLog, onOpenSaveLoad, quickSave]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/** Shortcut reference data for UI display */
export const SHORTCUT_REFERENCE = [
  { key: "Space", action: "Advance time / Simulate bouts" },
  { key: "Ctrl+S", action: "Quick save" },
  { key: "Ctrl+⇧+S", action: "Save/Load dialog" },
  { key: "E", action: "Toggle event log" },
  { key: "N", action: "Simulate next bout (Basho)" },
  { key: "A", action: "Simulate all bouts (Basho)" },
  { key: "1-9", action: "Quick navigate pages" },
] as const;
