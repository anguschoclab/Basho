/**
 * EconomyInfoNote.tsx
 *
 * Info note card for economy page.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export function EconomyInfoNote() {
  return (
    <Card className="bg-muted/30 paper">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-west mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">About Economy</p>
            <p>
              Your heya's finances are shaped by rank presence, supporter strength, and visibility.
              Strong basho performance draws prizes and kenshō—while injuries and travel quietly
              increase costs.
            </p>
            <p className="mt-2">
              The runway meter summarizes how safe your current trajectory is. Keep it healthy by
              developing talent, managing risk, and cultivating supporters and sponsors.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
