import React from "react";
import { Globe, Trophy, Building2, MapPin, ArrowRight } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";

export default function RegionalHubPage() {
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId = world?.playerHeyaId;
  const playerHeya = playerHeyaId ? world?.heyas.get(playerHeyaId) : null;
  
  const regionalPresence = playerHeya?.regionalPresence || {};
  const pendingExhibitions = world?.pendingExhibitions || [];
  
  const regions = ["Mongolia", "Georgia", "Europe", "Americas", "East_Asia"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-100">
            World Circuit Hub
          </h1>
          <p className="text-slate-400 font-medium">Manage international exhibitions and overseas academy operations.</p>
        </div>
        <div className="flex gap-4">
          <WidgetCard className="p-3 bg-slate-900/50 border-slate-800">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Global Presence</p>
            <p className="text-2xl font-black text-amber-500">{((Object.values(regionalPresence) as number[]).reduce((a, b) => a + b, 0) / 5).toFixed(1)}%</p>
          </WidgetCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regional Presence Column */}
        <div className="lg:col-span-2 space-y-6">
          <WidgetCard className="border-slate-800 bg-slate-950/40">
            <WidgetHeader title="Regional Influence" icon={Globe} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {regions.map((region) => {
                const score = regionalPresence[region] || 0;
                const status = score >= 80 ? "Academy" : score >= 40 ? "Visible" : "Hidden";
                
                return (
                  <div key={region} className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/50 group hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-slate-200">{region}</span>
                      </div>
                      <Badge variant={status === "Academy" ? "default" : status === "Visible" ? "secondary" : "outline"} className="text-[10px] uppercase">
                        {status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                        <span>Presence Score</span>
                        <span>{score}%</span>
                      </div>
                      <Progress value={score} className="h-1.5" />
                    </div>
                    {status === "Academy" && (
                      <Button variant="ghost" size="sm" className="w-full mt-4 text-[10px] uppercase font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/5">
                        Manage Academy <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </WidgetCard>

          <WidgetCard className="border-slate-800 bg-slate-950/40">
            <WidgetHeader title="Academy Infrastructure" icon={Building2} />
            <div className="mt-4 p-8 border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-center">
              <Building2 className="w-12 h-12 text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No Active Academies</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-1">
                Reach 80% presence in a region to unlock the ability to construct a specialized training academy.
              </p>
            </div>
          </WidgetCard>
        </div>

        {/* Pending Invitations Column */}
        <div className="space-y-6">
          <WidgetCard className="h-full border-slate-800 bg-slate-950/40 flex flex-col">
            <WidgetHeader title="Pending Invitations" icon={Trophy} />
            <ScrollArea className="flex-1 mt-4 pr-4">
              {pendingExhibitions.length === 0 ? (
                <div className="py-12 text-center">
                  <Trophy className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 italic">No invitations at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingExhibitions.map((inv: any) => (
                    <div key={inv.id} className="p-3 rounded border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">
                          {inv.region}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-mono">EXP: W{inv.expiresAtWeek}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-200">Prestige Exhibition</h4>
                      <p className="text-[10px] text-slate-500 mb-3">Req: {inv.requiresRank || "Any"}</p>
                      <Button size="sm" className="w-full text-[10px] font-bold h-7">
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
  );
}
