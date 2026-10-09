/**
 * WeeklyDrillPlanner.tsx
 * =====================
 * High-performance management interface for scheduling rikishi drills.
 * Featuring Batch Actions, Multi-select, and Intelligent Autoset.
 * (Phase O: Weekly Training Plans)
 * Composition shell — sections live in ./WeeklyDrillPlannerSections.tsx
 * and selection/autoset state in ../../hooks/useDrillPlanner.ts.
 */

import type { DrillType } from "@/engine/types/training";
import type { Rikishi } from "@/engine/types";
import { useDrillPlanner } from "@/hooks/useDrillPlanner";
import {
  PlannerHeader,
  BatchToolbar,
  DrillGrid,
  RegimenFooter,
} from "./WeeklyDrillPlannerSections";

interface WeeklyDrillPlannerProps {
  rikishiList: Rikishi[];
  weeklyPlan: Record<string, Record<number, DrillType>>;
  onPlanUpdate: (rikishiId: string, day: number, drillType: DrillType) => void;
  onBulkUpdate: (rikishiId: string, daySchedule: Record<number, DrillType>) => void;
  onMultiBulkUpdate: (rikishiIds: string[], daySchedule: Record<number, DrillType>) => void;
}

export function WeeklyDrillPlanner({
  rikishiList,
  weeklyPlan,
  onPlanUpdate,
  onBulkUpdate,
  onMultiBulkUpdate,
}: WeeklyDrillPlannerProps) {
  const planner = useDrillPlanner({ rikishiList, onBulkUpdate, onMultiBulkUpdate });

  return (
    <section className="space-y-6 pt-10 border-t-2 border-dashed">
      <PlannerHeader planner={planner} />
      <BatchToolbar planner={planner} />
      <DrillGrid
        rikishiList={rikishiList}
        weeklyPlan={weeklyPlan}
        planner={planner}
        onPlanUpdate={onPlanUpdate}
      />
      <RegimenFooter />
    </section>
  );
}
