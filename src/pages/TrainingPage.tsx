/**
 * TrainingPage.tsx
 * 
 * Dedicated stable training management.
 * Features a "Rich Aesthetics" Dossier style with pro-management dashboards.
 * FM-style layout for beya-wide training controls and individual development plans.
 */

import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, Link } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import {
  Activity,
  Dumbbell,
  Heart,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  Flame,
  CircleDot,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  FATIGUE_LABELS, 
  FOCUS_BIAS_MATRIX, 
  PHASE_EFFECTS, 
  POTENTIAL_LABELS,
  INTENSITY_MULTIPLIERS,
  RECOVERY_MULTIPLIERS,
  describeTrainingEffect,
  toFatigueBand,
  toPotentialBand,
  getCareerPhase,
  getIntensityLabel,
  getFocusLabel,
  getRecoveryLabel,
  createDefaultTrainingState,
  RANK_HIERARCHY
} from "@/presenters/uiDigest";
import { HQ_TABS } from "@/constants/navigation";
import { RikishiName } from "@/components/ClickableName";
import type { Rikishi } from "@/engine/types/rikishi";
import type { IndividualFocusType, TrainingIntensity, TrainingFocus, RecoveryEmphasis, BeyaTrainingState } from "@/engine/types/training";

const FOCUS_MODE_OPTIONS: { value: IndividualFocusType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { value: "develop", label: "Develop", description: "Balanced growth for rising talent", icon: <TrendingUp className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-500" },
  { value: "push", label: "Push", description: "Maximum growth, higher risk", icon: <Flame className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-500" },
  { value: "protect", label: "Protect", description: "Lower risk, preserve current form", icon: <Shield className="h-4 w-4" />, color: "bg-emerald-500/10 text-emerald-500" },
  { value: "rebuild", label: "Rebuild", description: "Recovery-focused after injury", icon: <Heart className="h-4 w-4" />, color: "bg-red-500/10 text-red-500" },
];

export default function TrainingPage() {
  const navigate = useNavigate();
  const { state, updateWorld } = useGame();
  const { world, playerHeyaId } = state;
  const heya = world?.heyas.get(playerHeyaId || "") ?? null;

  const [trainingState, setTrainingState] = useState<BeyaTrainingState>(() => {
    if (!world || !playerHeyaId) return createDefaultTrainingState(playerHeyaId || "");
    const existing = world.trainingState?.[playerHeyaId];
    if (existing) return existing;
    const legacy = (heya as any)?.trainingState as BeyaTrainingState | undefined;
    return legacy ?? createDefaultTrainingState(playerHeyaId || "");
  });

  const rikishiList = useMemo(() => {
    if (!heya || !world) return [];
    return (heya.rikishiIds ?? [])
      .map((id) => world.rikishi.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const tierA = RANK_HIERARCHY[a!.rank]?.tier ?? 99;
        const tierB = RANK_HIERARCHY[b!.rank]?.tier ?? 99;
        if (tierA !== tierB) return tierA - tierB;
        return a!.id.localeCompare(b!.id);
      }) as Rikishi[];
  }, [heya, world]);

  if (!world || !playerHeyaId || !heya) return null;

  const persistTrainingState = (next: BeyaTrainingState) => {
    if (!world.trainingState) world.trainingState = {};
    world.trainingState[playerHeyaId] = next;
    if ((heya as any).trainingState) delete (heya as any).trainingState;
    updateWorld({ ...world });
  };

  const handleIntensityChange = (intensity: TrainingIntensity) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, intensity } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleFocusChange = (focus: TrainingFocus) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, focus } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleRecoveryChange = (recovery: RecoveryEmphasis) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, recovery } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleIndividualFocusChange = (rikishiId: string, focusType: IndividualFocusType | null) => {
    setTrainingState((prev) => {
      const slots = (prev.focusSlots || []).filter(s => s.rikishiId !== rikishiId);
      if (focusType) slots.push({ rikishiId, focusType });
      const next = { ...prev, focusSlots: slots };
      persistTrainingState(next);
      return next;
    });
  };

  const currentIntensity = trainingState.activeProfile.intensity as TrainingIntensity;
  const intensityEffect = INTENSITY_MULTIPLIERS[currentIntensity];

  return (
    <AppLayout pageTitle="Training Management" subNavTabs={HQ_TABS} activeSubTab="training">
      <Helmet>
        <title>Training Ground — {heya.name} | Basho</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
        
        {/* ═══ HERO HEADER ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-2 border-border/20">
           <div>
              <div className="flex items-center gap-3 mb-1">
                 <div className="h-10 w-2 bg-primary rounded-full" />
                 <h1 className="text-5xl font-display font-black tracking-tight uppercase sumi-e-ink">Training Ground</h1>
              </div>
              <p className="text-sm font-medium text-muted-foreground opacity-70 flex items-center gap-2">
                 <Dumbbell className="h-4 w-4" /> Professional development and physical conditioning for {heya.name} Stable.
              </p>
           </div>
           
           <div className="flex gap-4">
              <div className="dossier-paper p-3 px-6 rounded-xl flex items-center gap-6 shadow-sm">
                 <div className="text-center border-r pr-6">
                    <p className="pro-header">Current Regime</p>
                    <p className="font-display font-black text-sm uppercase tracking-tighter text-primary">
                       {getIntensityLabel(currentIntensity)} Intensity
                    </p>
                 </div>
                 <div className="text-center">
                    <p className="pro-header">Roster Load</p>
                    <p className="font-display font-black text-sm uppercase tracking-tighter">{rikishiList.length} Active Slots</p>
                 </div>
              </div>
           </div>
        </div>

        {/* ═══ BEYA-WIDE REGIME ═══ */}
        <section className="grid gap-8 md:grid-cols-3">
          
          {/* Intensity Module */}
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <h3 className="pro-header">Intensity Level</h3>
             </div>
             <div className="grid gap-2">
                {(Object.keys(INTENSITY_MULTIPLIERS) as TrainingIntensity[]).map((intensity) => {
                  const isActive = trainingState.activeProfile.intensity === intensity;
                  const eff = INTENSITY_MULTIPLIERS[intensity];
                  return (
                    <TooltipWrap key={intensity} content={`${describeTrainingEffect(eff.growth)} growth rate with ${eff.fatigue}x fatigue impact`} side="right">
                      <button
                        onClick={() => handleIntensityChange(intensity)}
                        className={cn(
                          "dossier-paper p-4 text-left rounded-xl transition-all relative overflow-hidden group w-full",
                          isActive ? "border-primary bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl border-2" : "opacity-60 hover:opacity-100"
                        )}
                      >
                         <div className="flex justify-between items-center relative z-10">
                            <div className="font-display font-black text-sm uppercase truncate">{getIntensityLabel(intensity)}</div>
                            <Badge variant="outline" className={cn("text-[8px] font-black tracking-[0.2em]", isActive ? "bg-primary text-white border-0" : "opacity-50")}>
                               {describeTrainingEffect(eff.growth)}
                            </Badge>
                         </div>
                         {isActive && <div className="absolute top-0 right-0 h-1 w-full bg-primary" />}
                      </button>
                    </TooltipWrap>
                  );
                })}
             </div>
          </div>

          {/* Focus Area Module */}
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="pro-header">Tactical Focus</h3>
             </div>
             <div className="grid gap-2">
                {(Object.keys(FOCUS_BIAS_MATRIX) as TrainingFocus[]).map((focus) => {
                  const isActive = trainingState.activeProfile.focus === focus;
                  return (
                    <TooltipWrap key={focus} content={`Prioritize ${getFocusLabel(focus)} development for the entire stable`} side="right">
                      <button
                        onClick={() => handleFocusChange(focus)}
                        className={cn(
                          "dossier-paper p-4 text-left rounded-xl transition-all relative overflow-hidden w-full",
                          isActive ? "border-primary bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl border-2" : "opacity-60 hover:opacity-100"
                        )}
                      >
                         <div className="font-display font-black text-sm uppercase mb-0.5">{getFocusLabel(focus)}</div>
                         <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest opacity-60">Balanced Development</p>
                         {isActive && <div className="absolute top-0 right-0 h-1 w-full bg-primary" />}
                      </button>
                    </TooltipWrap>
                  );
                })}
             </div>
          </div>

          {/* Recovery Module */}
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-primary" />
                <h3 className="pro-header">Recovery Discipline</h3>
             </div>
             <div className="grid gap-2">
                {(Object.keys(RECOVERY_MULTIPLIERS) as RecoveryEmphasis[]).map((recovery) => {
                  const isActive = trainingState.activeProfile.recovery === recovery;
                  return (
                    <TooltipWrap key={recovery} content={`Shift emphasis to ${getRecoveryLabel(recovery)} within the rest cycle`} side="right">
                      <button
                        onClick={() => handleRecoveryChange(recovery)}
                        className={cn(
                          "dossier-paper p-4 text-left rounded-xl transition-all relative overflow-hidden w-full",
                          isActive ? "border-primary bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl border-2" : "opacity-60 hover:opacity-100"
                        )}
                      >
                         <div className="font-display font-black text-sm uppercase mb-0.5">{getRecoveryLabel(recovery)}</div>
                         <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest opacity-60">Rest Cycle Emphasis</p>
                         {isActive && <div className="absolute top-0 right-0 h-1 w-full bg-primary" />}
                      </button>
                    </TooltipWrap>
                  );
                })}
             </div>
          </div>
        </section>

        {/* ═══ INDIVIDUAL DEVELOPMENT PLANS ═══ */}
        <section className="space-y-6 pt-10 border-t-2 border-dashed">
           <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-secondary/10 rounded-xl">
                 <BrainCircuit className="h-6 w-6 text-primary" />
              </div>
              <div>
                 <h2 className="text-3xl font-display font-black uppercase tracking-tight">Individual Focus Slots</h2>
                 <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">High-performance personalized development coaching</p>
              </div>
           </div>

           <div className="grid gap-4">
              {(() => {
                const focusMap = new Map((trainingState.focusSlots || []).map(f => [f.rikishiId, f]));
                return rikishiList.map((rikishi, idx) => {
                  const focus = focusMap.get(rikishi.id);
                  const fb = toFatigueBand(rikishi.fatigue ?? 0);
                  const isExhausted = fb === "exhausted" || fb === "spent";
                  
                  return (
                    <div 
                      key={rikishi.id} 
                      className="dossier-paper p-6 rounded-2xl flex flex-col md:flex-row md:items-center gap-8 group hover:border-primary/50 transition-all animate-in slide-in-from-left-4 fill-mode-both"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                       <div className="flex-1 min-w-0 flex items-center gap-6">
                          <div className={cn("h-12 w-12 rounded-full flex items-center justify-center font-display font-black text-lg shadow-inner", rikishi.injured ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground")}>
                             {rikishi.shikona.charAt(0)}
                          </div>
                          <div className="min-w-0">
                             <div className="flex items-center gap-3 mb-1">
                                <span className="font-display font-black text-xl uppercase tracking-tighter truncate group-hover:text-primary transition-colors">
                                   <RikishiName id={rikishi.id} name={rikishi.shikona} />
                                </span>
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-2">{rikishi.rank}</Badge>
                                {rikishi.injured && <Badge className="bg-red-500 text-white text-[8px] h-5 font-black uppercase">INJURED</Badge>}
                             </div>
                             <div className="flex items-center gap-4 text-[9px] uppercase font-black text-muted-foreground tracking-widest">
                                <span className="flex items-center gap-2">
                                   <Activity className={cn("h-3 w-3", isExhausted ? "text-red-500 animate-pulse" : "text-emerald-500")} />
                                   {FATIGUE_LABELS[fb]}
                                </span>
                                <span className="h-1 w-1 bg-border/40 rounded-full" />
                                <span>{getCareerPhase(rikishi.experience)} Phase</span>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-2 shrink-0 bg-muted/30 p-2 rounded-2xl border border-dashed">
                          {FOCUS_MODE_OPTIONS.map((opt) => {
                             const isActive = focus?.focusType === opt.value;
                             return (
                               <button
                                 key={opt.value}
                                 onClick={() => handleIndividualFocusChange(rikishi.id, isActive ? null : opt.value)}
                                 className={cn(
                                   "flex flex-col items-center justify-center h-14 w-20 rounded-xl transition-all gap-1",
                                   isActive ? "bg-primary text-white shadow-lg scale-105" : "text-muted-foreground hover:bg-white/50"
                                 )}
                                 title={opt.description}
                               >
                                  {opt.icon}
                                  <span className="text-[8px] font-black uppercase tracking-tighter">{opt.label}</span>
                               </button>
                             );
                          })}
                       </div>
                    </div>
                  );
                });
              })()}
              
              {rikishiList.length === 0 && (
                <div className="py-24 text-center dossier-paper rounded-2xl border-dashed opacity-50 space-y-4">
                   <Users className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                   <p className="font-display italic text-sm">Review your roster directory to assign professional coaching targets.</p>
                </div>
              )}
           </div>
        </section>

        {/* ═══ REFERENCE LEGEND ═══ */}
        <section className="dossier-paper p-8 rounded-3xl bg-muted/20 border-2 border-dashed">
           <div className="flex items-center gap-3 mb-6">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              <h4 className="pro-header">Focus Orientation Reference</h4>
           </div>
           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FOCUS_MODE_OPTIONS.map((opt) => (
                <div key={opt.value} className="space-y-2">
                   <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", opt.color)}>
                         {opt.icon}
                      </div>
                      <div className="font-display font-black text-sm uppercase">{opt.label}</div>
                   </div>
                   <p className="text-[10px] text-muted-foreground leading-relaxed italic">"{opt.description}"</p>
                </div>
              ))}
           </div>
        </section>

      </div>
    </AppLayout>
  );
}
