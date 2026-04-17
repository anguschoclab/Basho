/**
 * BailoutCard.tsx
 *
 * Emergency funding card for economy page.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";

interface BailoutCardProps {
  canRequestBailout: boolean;
  onBailoutRequest: () => void;
}

export function BailoutCard({ canRequestBailout, onBailoutRequest }: BailoutCardProps) {
  return (
    <Card
      className={cn(
        "paper flex flex-col justify-center",
        canRequestBailout ? "border-destructive/30" : "bg-muted/10"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HandCoins className="h-4 w-4" /> Association Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Stables in severe financial distress may request emergency bailout loans from the Sumo
          Association.
        </p>
        <Button
          variant={canRequestBailout ? "destructive" : "outline"}
          className="w-full text-xs font-bold uppercase tracking-widest h-10"
          disabled={!canRequestBailout}
          onClick={onBailoutRequest}
          tooltip="Apply for an emergency bailout from the Association (Requires debt over ¥5M)"
          tooltipSide="top"
        >
          Request Emergency Funding
        </Button>
        {canRequestBailout && (
          <p className="text-[10px] text-destructive/80 italic text-center">
            Requires funds below -¥5,000,000. Carries heavy stipulations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
