/**
 * InfrastructureDashboard.tsx
 * ===========================
 * Orchestrates the 'Stable Town' architectural development.
 * (Phase P: Stable Town & Infrastructure)
 */

import { useMemo } from "react";
import { FACILITY_REGISTRY, FacilityId } from "@/engine/types/infrastructure";
import type { Heya } from "@/engine/types/heya";
import { InfrastructureOverview, FacilityCard } from "./InfrastructureSections";

interface InfrastructureDashboardProps {
  heya: Heya;
  onUpgrade: (facilityId: FacilityId) => void;
}

export function InfrastructureDashboard({ heya, onUpgrade }: InfrastructureDashboardProps) {
  const infra = heya.infrastructure || {};
  const queue = useMemo(() => heya.constructionQueue || [], [heya.constructionQueue]);

  const projectByFacilityId = useMemo(() => new Map(queue.map((q) => [q.facilityId, q])), [queue]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <InfrastructureOverview infra={infra} queueLength={queue.length} />

      {/* Facility Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.values(FACILITY_REGISTRY).map((facility) => (
          <FacilityCard
            key={facility.id}
            facility={facility}
            state={infra[facility.id]}
            project={projectByFacilityId.get(facility.id)}
            onUpgrade={onUpgrade}
          />
        ))}
      </div>
    </div>
  );
}
