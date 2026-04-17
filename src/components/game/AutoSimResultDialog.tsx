/**
 * AutoSimResultDialog.tsx
 *
 * Result dialog component for AutoSimControls.
 */

import { Trophy, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RikishiName } from "@/components/ClickableName";
import type { AutoSimResult } from "@/engine/autoSim";
import { clampInt } from "@/presenters/uiDigest";

interface AutoSimResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AutoSimResult | null;
}

function safeNumber(n: unknown, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export function AutoSimResultDialog({ open, onOpenChange, result }: AutoSimResultDialogProps) {
  const yearsElapsed = result
    ? clampInt(safeNumber(result.endYear, 0) - safeNumber(result.startYear, 0), 0, 10_000)
    : 0;

  const bashoSimulated = result
    ? clampInt(safeNumber((result as AutoSimResult).bashoSimulated, 0), 0, 1_000_000)
    : 0;
  const chronicle = result?.chronicle as
    | {
        highlights?: string[];
        topChampions?: { rikishiId: string; shikona: string; yushoCount: number }[];
      }
    | undefined;
  const highlights: string[] = Array.isArray(chronicle?.highlights) ? chronicle.highlights : [];
  const topChampions: { rikishiId: string; shikona: string; yushoCount: number }[] = Array.isArray(
    chronicle?.topChampions
  )
    ? chronicle.topChampions
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            Simulation Complete
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <div className="text-2xl font-bold">{bashoSimulated}</div>
              <div className="text-xs text-muted-foreground">Basho</div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <div className="text-2xl font-bold">{yearsElapsed}</div>
              <div className="text-xs text-muted-foreground">Years</div>
            </div>
          </div>
          {highlights.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {highlights.map((h, i) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        {h}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          {topChampions.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Champions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topChampions.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <RikishiName id={c.rikishiId} name={c.shikona} />{" "}
                      <Badge variant="outline">{c.yushoCount} yusho</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
