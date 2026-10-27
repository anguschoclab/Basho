/**
 * StableHealthWidget.tsx
 * Dashboard widget displaying stable health, compliance, and governance status.
 */

import { useGame } from "@/state/game/useGame";
import { StableHealthPanel } from "@/components/stable/StableHealthPanel";
import { BaseWidget } from "@/components/dashboard/BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building2 } from "lucide-react";
import { projectHeyaData } from "@/presenters/projections/heyaProjections";

export function StableHealthWidget() {
  const { state } = useGame();
  const { world, playerHeyaId } = state;

  const heya = playerHeyaId && world ? world.heyas.get(playerHeyaId) : null;

  if (!world || !heya) {
    return (
      <BaseWidget title="Stable Health" icon={Building2} className="h-full">
        <EmptyState icon={Building2} title="No stable selected" compact />
      </BaseWidget>
    );
  }

  const data = projectHeyaData(world, heya.id);

  return (
    <BaseWidget title="Stable Health" icon={Building2} className="h-full">
      <div className="p-0">
        {data && (
          <StableHealthPanel
            heya={heya}
            oyakata={data.oyakata}
            oyakataQuirks={data.oyakataQuirks}
            oyakataTraits={data.oyakataTraits}
          />
        )}
      </div>
    </BaseWidget>
  );
}
