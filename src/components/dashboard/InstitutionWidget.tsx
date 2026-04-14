/**
 * InstitutionWidget.tsx
 * Dashboard widget displaying institutional health, compliance, and governance status.
 */

import { useGame } from "@/contexts/GameContext";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { projectHeyaData } from "@/presenters/uiDigest";

export function InstitutionWidget() {
  const { state } = useGame();
  const { world, playerHeyaId } = state;

  const heya = playerHeyaId && world ? world.heyas.get(playerHeyaId) : null;

  if (!world || !heya) {
    return (
      <Card className="paper h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4" />
            Institution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No stable selected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="paper h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4" />
          Institution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
  );
}
