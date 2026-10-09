// FacilitiesManagementPanel.tsx — facilities overview + per-axis upgrades.
// Sections live in ./FacilitiesManagementPanelSections.tsx; axis metadata in
// ./facilityMeta.ts.

import { useMemo, useState, useRef, useEffect } from "react";
import type { Heya } from "@/engine/types/heya";
import type { FacilityAxis } from "@/presenters/engineAccess";
import { getMonthlyMaintenanceCost } from "@/presenters/uiDigest";
import {
  type UpgradeToast,
  FacilityOverviewCard,
  FacilityUpgradeToast,
  FacilityAxisCard,
  FacilitiesInfoCard,
} from "./FacilitiesManagementPanelSections";

/** Defines the structure for facilities management panel props. */
interface FacilitiesManagementPanelProps {
  heya: Heya;
  isOwner: boolean;
  onUpgrade: (axis: FacilityAxis, points: number) => void;
}

const AXES: FacilityAxis[] = ["training", "recovery", "nutrition"];

/**
 * facilities management panel.
 *  * @param { heya, isOwner, onUpgrade } - The component props.
 */
export function FacilitiesManagementPanel({
  heya,
  isOwner,
  onUpgrade,
}: FacilitiesManagementPanelProps) {
  const [toast, setToast] = useState<UpgradeToast | null>(null);
  const prevHeyaRef = useRef<Heya | null>(null);
  const pendingUpgradeRef = useRef<{ axis: FacilityAxis; points: number } | null>(null);

  // Detect heya changes from WORLD_UPDATED and derive toast from real world diff
  useEffect(() => {
    const prev = prevHeyaRef.current;
    if (prev) {
      for (const axis of AXES) {
        const oldLevel = prev.facilities[axis] ?? 0;
        const newLevel = heya.facilities[axis] ?? 0;
        if (newLevel > oldLevel) {
          const cost = prev.funds - heya.funds;
          setToast({ axis, oldLevel, newLevel, cost });
          break;
        }
      }
    }
    prevHeyaRef.current = heya;
  }, [heya]);

  const monthlyMaintenance = useMemo(() => getMonthlyMaintenanceCost(heya), [heya]);

  const handleUpgrade = (axis: FacilityAxis, points: number) => {
    pendingUpgradeRef.current = { axis, points };
    onUpgrade(axis, points);
  };

  return (
    <>
      {/* Overall band */}
      <FacilityOverviewCard heya={heya} monthlyMaintenance={monthlyMaintenance} />

      {/* Feedback toast */}
      {toast && <FacilityUpgradeToast toast={toast} />}

      {/* Per-axis cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {AXES.map((axis) => (
          <FacilityAxisCard
            key={axis}
            heya={heya}
            axis={axis}
            isOwner={isOwner}
            onUpgrade={handleUpgrade}
          />
        ))}
      </div>

      {/* Info card */}
      <FacilitiesInfoCard />
    </>
  );
}
