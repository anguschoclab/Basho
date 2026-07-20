/**
 * InstitutionWidget.tsx
 * Dashboard widget displaying institutional health, compliance, and governance status.
 */

import { useGame } from "@/contexts/GameContext";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { BaseWidget } from "./BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building2 } from "lucide-react";
import { projectHeyaData } from "@/presenters/projections/heyaProjections";

export function InstitutionWidget() {
  const { state } = useGame();
  const { world, playerHeyaId } = state;

  const heya = playerHeyaId && world ? world.heyas.get(playerHeyaId) : null;

  if (!world || !heya) {
    return (
      <BaseWidget title="Institution" icon={Building2} className="h-full">
        <EmptyState icon={Building2} title="No stable selected" compact />
      </BaseWidget>
    );
  }

  return (
    <BaseWidget title="Institution" icon={Building2} className="h-full">
      <div className="p-0">
        {(() => {
          const data = projectHeyaData(world, heya.id);
          if (!data) return null;
          return (
            <InstitutionPanel
              heya={heya}
              oyakata={data.oyakata}
              oyakataQuirks={data.oyakataQuirks}
              oyakataTraits={data.oyakataTraits}
            />
          );
        })()}
      </div>
    </BaseWidget>
  );
}
