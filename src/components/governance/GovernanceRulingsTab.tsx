/**
 * GovernanceRulingsTab.tsx
 * ========================
 * Rulings tab for GovernancePage: pending ruling cards with
 * lenient/standard/harsh actions and the resolved-rulings record list.
 */

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListCard } from "@/components/layout/control-center";
import { TabsContent } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { useGame } from "@/contexts/useGame";
import { formatFinePenalty } from "@/presenters/uiDigest";
import type { GovernanceDerivedData } from "@/hooks/useGovernanceDerived.tsx";

interface Props {
  derived: GovernanceDerivedData;
  resolvedRulingIds: Set<string>;
}

export function GovernanceRulingsTab({ derived, resolvedRulingIds }: Props) {
  const { issueRuling } = useGame();

  return (
    <TabsContent value="rulings" className="space-y-6">
      {derived.pendingRulings.length === 0 ? (
        <Card className="paper">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No rulings pending your decision. Keep a clean house.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {derived.pendingRulings.map((ruling) => (
            <Card key={ruling.id} className="paper border-warning/40 bg-warning/5">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    <CardTitle className="text-sm font-bold uppercase tracking-wide">
                      {ruling.type} — {ruling.severity} severity
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {ruling.date}
                  </Badge>
                </div>
                <CardDescription className="ml-6 text-xs">{ruling.reason}</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 ml-6 space-y-3">
                {ruling.effects.fineAmount && (
                  <p className="text-xs text-muted-foreground">
                    Proposed fine:{" "}
                    <span className="font-mono font-bold text-destructive">
                      {formatFinePenalty(ruling.effects.fineAmount)}
                    </span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-success/40 text-success hover:bg-success/10 text-xs h-7"
                    onClick={() => {
                      issueRuling(ruling.id, "lenient");
                      toast.success("Lenient ruling issued — costs 10 political capital.");
                    }}
                  >
                    Lenient (−10 cap)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => {
                      issueRuling(ruling.id, "standard");
                      toast.info("Standard ruling issued.");
                    }}
                  >
                    Standard
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs h-7"
                    onClick={() => {
                      issueRuling(ruling.id, "harsh");
                      toast.success("Harsh ruling issued — earns 5 political capital.");
                    }}
                  >
                    Harsh (+5 cap)
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/60 leading-tight">
                  Lenient reduces scandal impact but costs capital. Harsh maximises the penalty and
                  earns capital. Standard applies full effects as written.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListCard
        eyebrow="── RECORD ──"
        title="Resolved Rulings"
        rows={derived.historyRows.filter((r) => resolvedRulingIds.has(r.id))}
        emptyText="No resolved rulings yet."
      />
    </TabsContent>
  );
}
