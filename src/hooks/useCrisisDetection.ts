/**
 * useCrisisDetection.ts
 *
 * Crisis detection for CrisisModal — combines three sources (world
 * pendingCrisis, welfare compliance state, digest items) into a single
 * active crisis, and manages the modal open state (world-backed crises
 * cannot be dismissed without resolving).
 */

import { useState, useMemo, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { useGame } from "@/contexts/useGame";
import { getPlayerHeya } from "@/presenters/engineAccess";
import type { CrisisOption } from "@/engine/types/crises";

export interface ActiveCrisis {
  id: string;
  title: string;
  detail: string;
  type: string;
  options?: CrisisOption[];
}

export function useCrisisDetection() {
  const digest = useGameStore((state) => state.digest);
  const { state } = useGame();
  const world = state.world;
  const [isOpen, setIsOpen] = useState(false);

  // Get player heya welfare state
  const playerHeya = world ? (getPlayerHeya(world) ?? null) : null;
  const welfareState = playerHeya?.welfareState;

  // Check for welfare crisis (investigation, sanctioned, high risk)
  const welfareCrisis = useMemo<Omit<ActiveCrisis, "id"> | null>(() => {
    if (!welfareState) return null;

    if (welfareState.complianceState === "sanctioned") {
      return {
        title: "Welfare Sanction",
        detail: `Your stable is under official sanctions. Risk level: ${welfareState.welfareRisk}%`,
        type: "welfare_sanction",
      };
    }
    if (welfareState.complianceState === "investigation" && welfareState.welfareRisk > 75) {
      return {
        title: "Welfare Investigation",
        detail: `Active investigation with critical risk level: ${welfareState.welfareRisk}%`,
        type: "welfare_investigation",
      };
    }
    return null;
  }, [welfareState]);

  // Check for crisis in digest
  const digestCrisis = digest?.sections
    ?.find((s) => s.id === "governance" || s.id === "media")
    ?.items?.find((i) => i.kind === "generic" && i.title.toLowerCase().includes("crisis"));

  // Combine both crisis sources
  const crisis = useMemo<ActiveCrisis | null>(() => {
    if (world?.pendingCrisis) {
      return {
        id: world.pendingCrisis.id,
        title: world.pendingCrisis.title,
        detail: world.pendingCrisis.description,
        type: "pending_crisis",
        options: world.pendingCrisis.options,
      };
    }
    if (welfareCrisis) return { ...welfareCrisis, id: "welfare_crisis" };
    if (digestCrisis) {
      return {
        id: "digest_crisis",
        title: digestCrisis.title,
        detail: digestCrisis.detail || "",
        type: "digest_crisis",
      };
    }
    return null;
  }, [world?.pendingCrisis, welfareCrisis, digestCrisis]);

  // Logic to auto-open if a crisis is detected
  useEffect(() => {
    if (crisis) {
      setIsOpen(true);
    }
  }, [crisis]);

  const isWorldBacked = crisis?.type === "loop_decision" || crisis?.type === "pending_crisis";
  // World-backed crises derive open state from the world's pendingCrisis —
  // it cannot be dismissed without resolving (ESC/outside-click would
  // softlock a halted sim, since nothing re-triggers the modal while the
  // world is unchanged). Welfare/digest crises remain dismissible.
  const open = isWorldBacked ? !!crisis : isOpen;

  return { world, crisis, isWorldBacked, open, setIsOpen };
}
