import { Globe, Trophy, Building2, MapPin, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/GameContext";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingExhibition {
  id: string;
  region: string;
  prestige?: number;
  expiresAtWeek?: number;
  requiresRank?: string;
  [key: string]: unknown;
}

export default function RegionalHubPage() {
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId = world?.playerHeyaId;
  const playerHeya = playerHeyaId ? world?.heyas.get(playerHeyaId) : null;

  const regionalPresence = playerHeya?.regionalPresence || {};
  const pendingExhibitions = (world?.pendingExhibitions || []) as PendingExhibition[];

  const regions = ["Mongolia", "Georgia", "Europe", "Americas", "East_Asia"];

  if (!world) {
    return (
      <AppLayout pageTitle="World Circuit" subNavTabs={TOURNAMENT_TABS} activeSubTab="world-circuit">
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          No world loaded. Start a game to access the World Circuit.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="World Circuit" subNavTabs={TOURNAMENT_TABS} activeSubTab="world-circuit">
      <div className="space-y-6">
        <PageHeader
          eyebrow="── INTERNATIONAL ──"
          title="World Circuit Hub"
          lede="Manage international exhibitions and overseas academy operations."
        />

        <div className="flex justify-end">
          <WidgetCard className="p-3 bg-card/50 border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">
              Global Presence
            </p>
            <p className="text-2xl font-black text-primary font-mono">
              {(
                (Object.values(regionalPresence) as number[]).reduce((a, b) => a + b, 0) / 5
              ).toFixed(1)}
              %
            </p>
          </WidgetCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Regional Presence Column */}
          <div className="lg:col-span-2 space-y-6">
            <WidgetCard className="border-border bg-card/40">
              <WidgetHeader title="Regional Influence" icon={Globe} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {regions.map((region) => {
                  const score = regionalPresence[region] || 0;
                  const status = score >= 80 ? "Academy" : score >= 40 ? "Visible" : "Hidden";

                  return (
                    <div
                      key={region}
                      className="p-4 rounded-lg bg-secondary/40 border border-border/50 group hover:border-border transition-colors"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-bold text-foreground font-display">{region}</span>
                        </div>
                        <Badge
                          variant={
                            status === "Academy"
                              ? "default"
                              : status === "Visible"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px] uppercase font-mono"
                        >
                          {status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground font-mono">
                          <span>Presence Score</span>
                          <span>{score}%</span>
                        </div>
                        <Progress value={score} className="h-1.5" />
                      </div>
                      {status === "Academy" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          title="Academy management coming soon"
                          className="w-full mt-4 text-[10px] uppercase font-bold text-primary hover:text-primary/80 hover:bg-primary/5 font-mono"
                        >
                          Manage Academy <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </WidgetCard>

            <WidgetCard className="border-border bg-card/40">
              <WidgetHeader title="Academy Infrastructure" icon={Building2} />
              <div className="mt-4 p-8 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center">
                <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-bold text-foreground font-display">
                  No Active Academies
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1 font-body">
                  Reach 80% presence in a region to unlock the ability to construct a specialized
                  training academy.
                </p>
              </div>
            </WidgetCard>
          </div>

          {/* Pending Invitations Column */}
          <div className="space-y-6">
            <WidgetCard className="h-full border-border bg-card/40 flex flex-col">
              <WidgetHeader title="Pending Invitations" icon={Trophy} />
              <ScrollArea className="flex-1 mt-4 pr-4">
                {pendingExhibitions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground italic font-body">
                      No invitations at this time
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingExhibitions.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded border border-border bg-secondary/60 hover:bg-secondary transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/30 text-primary font-mono"
                          >
                            {inv.region}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            EXP: W{inv.expiresAtWeek}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground font-display">
                          Prestige Exhibition
                        </h4>
                        <p className="text-[10px] text-muted-foreground mb-3 font-mono">
                          Req: {inv.requiresRank || "Any"}
                        </p>
                        <Button
                          size="sm"
                          disabled
                          title="Exhibition acceptance coming soon"
                          className="w-full text-[10px] font-bold h-7 font-mono"
                        >
                          ACCEPT INVITATION
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </WidgetCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
