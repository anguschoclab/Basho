// useKeyboardShortcuts.ts — Global keyboard shortcuts for game navigation & actions
// Space = advance time, E = toggle event log, number keys = quick nav, etc.

import { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";

interface ShortcutOptions {
  eventLogOpen: boolean;
  onToggleEventLog: () => void;
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

export function useKeyboardShortcuts({ eventLogOpen, onToggleEventLog }: ShortcutOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, advanceOneDay, advanceDay, simulateBout, simulateAllBouts, endBasho, startBasho } = useGame();
  const world = state.world;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;

      // ── SPACE: Advance time ──
      if (key === " " && !ctrl) {
        e.preventDefault();
        if (!world) return;

        if (world.cyclePhase === "active_basho") {
          // During basho, space simulates next bout or advances day
          if (location.pathname === "/basho") {
            // Let BashoPage handle its own sim logic via the button
            // We simulate all remaining bouts for the day
            simulateAllBouts();
          } else {
            advanceDay();
          }
        } else {
          // Interim/pre/post: advance one day
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

      // ── T: Toggle theme (handled in TopNavBar, skip here) ──

      // ── Number keys 1-9: Quick navigation ──
      if (!ctrl && !e.shiftKey && !e.altKey && QUICK_NAV[key]) {
        e.preventDefault();
        navigate(QUICK_NAV[key]);
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

      // ── ?: Show shortcuts help (shift+/) ──
      // Could be added later as a modal
    },
    [world, state, location.pathname, navigate, advanceOneDay, advanceDay, simulateBout, simulateAllBouts, onToggleEventLog]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/** Shortcut reference data for UI display */
export const SHORTCUT_REFERENCE = [
  { key: "Space", action: "Advance time / Simulate bouts" },
  { key: "E", action: "Toggle event log" },
  { key: "N", action: "Simulate next bout (Basho)" },
  { key: "A", action: "Simulate all bouts (Basho)" },
  { key: "1-9", action: "Quick navigate pages" },
] as const;
