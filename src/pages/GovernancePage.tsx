import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, Scale, Gavel, FileWarning, Landmark, Users } from "lucide-react";
import { spendPoliticalCapital } from "@/engine/governance";
import { Button } from "@/components/ui/button";
import type { GovernanceStatus, GovernanceRuling } from "../../types/economy";
import type { Heya } from "../../types/heya";
import { getStatusColor, getStatusLabel } from "@/engine/governance";
import { toScandalBand, SCANDAL_LABELS, toPrizeBand, PRIZE_LABELS } from "@/engine/descriptorBands";

/**
 * Format fine penalty.
 *  * @param amount - The Amount.
 *  * @returns The result.
 */
function formatFinePenalty(amount: number): string {
  if (amount >= 10_000_000) return "Severe fine";
  if (amount >= 3_000_000) return "Significant fine";
  if (amount >= 500_000) return "Moderate fine";
  return "Minor fine";
}

/** governance page. */
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

  const managementTabs = [
    { id: "economy", label: "Economy", href: "/economy" },
    { id: "scouting", label: "Scouting", href: "/scouting" },
    { id: "talent", label: "Talent Pools", href: "/talent" },
    { id: "governance", label: "Governance", href: "/governance" },
    { id: "myoseki", label: "Myoseki", href: "/myoseki" },
    { id: "myoseki", label: "Myoseki", href: "/myoseki" },
  ];

  return (
    <AppLayout
      pageTitle="Governance & Compliance"
      subNavTabs={managementTabs}
      activeSubTab="governance"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Official records of the Sumo Association regarding {heya.name}.
          </p>
          <Badge variant={status === "good_standing" ? "outline" : "destructive"} className="text-lg px-4 py-1">
            <Scale className="mr-2 h-4 w-4" />
            {getStatusLabel(status)}
          </Badge>
        </div>


        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="politics" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Politics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
<div className="grid gap-6 md:grid-cols-4">
          {/* Scandal Perception */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Public Perception
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const band = toScandalBand(scandal);
                return (
                  <div>
                    <div className="text-2xl font-bold">{SCANDAL_LABELS[band]}</div>
                    <Progress value={Math.min(scandal, 100)} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {band === "clean" ? "Clean record — no concerns." :
                       band === "whispers" ? "Minor concerns circulating." :
                       band === "scrutiny" ? "Under increasing public scrutiny." :
                       band === "scandal" ? "Significant reputational damage." :
                       "Crisis-level public perception."}
                    </p>
                  </div>
                );
              })()}
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
                const compState = String(welfare?.complianceState ?? "compliant");
                const { bandWelfareLabel } = (() => {
                  if (risk <= 20) return { bandWelfareLabel: "Safe" };
                  if (risk <= 44) return { bandWelfareLabel: "Cautious" };
                  if (risk <= 69) return { bandWelfareLabel: "Elevated" };
                  return { bandWelfareLabel: "Critical" };
                })();
                return (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">{bandWelfareLabel}</div>
                      <Badge variant={compState === "compliant" ? "outline" : compState === "watch" ? "secondary" : "destructive"} className="text-xs">
                        {compState.toUpperCase()}
                      </Badge>
                    </div>
                    <Progress value={risk} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {compState === "compliant"
                        ? "No active concerns."
                        : compState === "watch"
                        ? "Under monitoring for welfare risk."
                        : compState === "investigation"
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
                          Fine: {formatFinePenalty(ruling.effects.fineAmount)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

          </TabsContent>

          {/* Politics Tab */}
          <TabsContent value="politics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ichimon Politics (The Game of Thrones)
                </CardTitle>
                <CardDescription>
                  Your stable belongs to the <strong>{heya.ichimon} Ichimon</strong>.
                  Use Political Capital to sway JSA Board elections, forge alliances, and dominate the sumo world.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Your Political Standing</h3>
                    <div className="bg-muted p-4 rounded-md mb-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">{heya.politicalCapital || 0}</p>
                        <p className="text-xs text-muted-foreground">Political Capital</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (heya && heya.politicalCapital && heya.politicalCapital >= 100) {
                            spendPoliticalCapital(world, heya.id, 100);
                            setHeya({ ...heya, politicalCapital: heya.politicalCapital - 100 });
                          } else {
                            alert("Not enough Political Capital (need 100).");
                          }
                        }}
                        disabled={(heya.politicalCapital || 0) < 100}
                      >
                        Spend 100 Capital
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Spending capital boosts your Ichimon's influence by 20 points, helping secure the JSA Chairman seat in the next bi-annual election.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Ichimon Influence Rankings</h3>
                    <div className="space-y-3">
                      {world.factions ? Object.values(world.factions).sort((a, b) => b.influence - a.influence).map(fac => {
                        const isChairman = Math.max(...Object.values(world.factions!).map(f => f.influence)) === fac.influence;
                        return (
                          <div key={fac.id} className="flex justify-between items-center border-b pb-2">
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {fac.name}
                                {isChairman && <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">Chairman</Badge>}
                                {heya.ichimon === fac.id && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary text-primary">Your Faction</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground">Leader: {world.oyakata.get(fac.oyakataLeaderId || "")?.name || "Unknown"}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{fac.influence}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">Influence</p>
                            </div>
                          </div>
                        );
                      }) : <p className="text-sm text-muted-foreground">No faction data available.</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
  </div>
    </AppLayout>
  );
}
