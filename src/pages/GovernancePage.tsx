import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, Scale, Gavel, FileWarning } from "lucide-react";
import type { GovernanceStatus, GovernanceRuling, Heya } from "@/engine/types";
import { getStatusColor, getStatusLabel } from "@/engine/governance";

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `¥${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `¥${(amount / 1_000).toFixed(0)}K`;
  return `¥${amount}`;
}

export default function GovernancePage() {
  const { state } = useGame();
  const world = state.world;
  const [heya, setHeya] = useState<Heya | null>(null);

  useEffect(() => {
    if (world && world.playerHeyaId) {
      setHeya(world.heyas.get(world.playerHeyaId) || null);
    }
  }, [world]);

  if (!world || !heya) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">Loading Council Records...</div>
      </AppLayout>
    );
  }

  const status = heya.governanceStatus || "good_standing";
  const scandal = heya.scandalScore || 0;
  const history = heya.governanceHistory || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Governance & Compliance</h1>
            <p className="text-muted-foreground">
              Official records of the Sumo Association regarding {heya.name}.
            </p>
          </div>
          <Badge variant={status === "good_standing" ? "outline" : "destructive"} className="text-lg px-4 py-1">
            <Scale className="mr-2 h-4 w-4" />
            {getStatusLabel(status)}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {/* Scandal Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Scandal Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{scandal}</div>
              <Progress 
                value={Math.min(scandal, 100)} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {scandal < 25 ? "Clean record" : scandal < 50 ? "Minor concerns" : scandal < 75 ? "Significant issues" : "Critical situation"}
              </p>
            </CardContent>
          </Card>

          
          {/* Welfare / Compliance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Welfare & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const welfare = (heya as any).welfareState;
                const risk = Math.max(0, Math.min(100, Number(welfare?.welfareRisk ?? 10)));
                const state = String(welfare?.complianceState ?? "compliant");
                return (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">{risk}</div>
                      <Badge variant={state === "compliant" ? "outline" : state === "watch" ? "secondary" : "destructive"} className="text-xs">
                        {state.toUpperCase()}
                      </Badge>
                    </div>
                    <Progress value={risk} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {state === "compliant"
                        ? "No active concerns."
                        : state === "watch"
                        ? "Under monitoring for welfare risk."
                        : state === "investigation"
                        ? "Investigation open — remediation required."
                        : "Sanctions active — recruitment/training may be restricted."}
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gavel className="h-4 w-4" />
                Council Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
                {getStatusLabel(status)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status === "good_standing" 
                  ? "Your stable is in good standing with the Association."
                  : status === "warning"
                  ? "The Council has noted concerns."
                  : status === "probation"
                  ? "Formal probation is in effect."
                  : "Serious sanctions have been applied."
                }
              </p>
            </CardContent>
          </Card>

          {/* Rulings Count */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileWarning className="h-4 w-4" />
                Past Rulings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{history.length}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Total disciplinary actions on record.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* History Tab */}
        <Card>
          <CardHeader>
            <CardTitle>Ruling History</CardTitle>
            <CardDescription>Official council decisions affecting your stable.</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No rulings on record. Keep it that way.
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {history.map((ruling, i) => (
                    <div key={ruling.id || i} className="border-l-4 border-destructive pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{ruling.type.toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">{ruling.reason}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {ruling.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{ruling.date}</p>
                      {ruling.effects?.fineAmount && (
                        <p className="text-sm text-destructive mt-1">
                          Fine: {formatCurrency(ruling.effects.fineAmount)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
