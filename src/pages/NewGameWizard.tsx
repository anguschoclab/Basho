/**
 * NewGameWizard.tsx
 * 
 * Cinematic onboarding flow for new stable inaugurations.
 * Features a "Rich Aesthetics" Heroic layout with Noto Serif JP overlays.
 * Architecturally cleaned up to use centralized engine utilities.
 */

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  CircleUser, 
  Star, 
  ArrowRight, 
  ArrowLeft, 
  Trophy, 
  DollarSign, 
  Building,
  History,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Helmet } from "react-helmet";
import { makeDeterministicSeed, formatYenToMan } from "@/utils/engineUtils";
import { cn } from "@/lib/utils";
import type { Heya } from "@/engine/types/heya";
import { ExhibitionBout } from "@/components/onboarding/ExhibitionBout";

const OYAKATA_BACKGROUNDS = [
  {
    id: "yokozuna",
    label: "Former Yokozuna",
    labelJa: "横綱出身",
    description: "Maximum prestige and institutional respect. Your reputation precedes you, making recruitment of elite talent easier, though expectations are sky-high.",
    bonuses: { prestige: 2, funds: 5_000_000, scouting: 70, training: 80 },
    icon: Trophy,
    color: "amber"
  },
  {
    id: "ozeki",
    label: "Former Ozeki",
    labelJa: "大関出身",
    description: "Highly respected with a strong network of supporters (koenkai). A balanced start with decent financial backing and solid training roots.",
    bonuses: { prestige: 1, funds: 15_000_000, scouting: 60, training: 70 },
    icon: Star,
    color: "blue"
  },
  {
    id: "maegashira",
    label: "Former Maegashira",
    labelJa: "幕内出身",
    description: "A seasoned journeyman with a massive business network. While you lack top-tier prestige, your deep pockets allow for rapid facility expansion.",
    bonuses: { prestige: 0, funds: 30_000_000, scouting: 50, training: 50 },
    icon: DollarSign,
    color: "emerald"
  },
];

const ICHIMON_FACTIONS = [
  { id: "dewanoumi", name: "Dewanoumi", ja: "出羽海", description: "The largest and most traditional faction with deep political roots." },
  { id: "nishonoseki", name: "Nishonoseki", ja: "二所ノ関", description: "A powerful, modern faction known for wealth and influence." },
  { id: "takasago", name: "Takasago", ja: "高砂", description: "Fierce independence and a storied history of elite champions." },
  { id: "tokitsukaze", name: "Tokitsukaze", ja: "時津風", description: "A balanced bloc focused on fundamental training excellence." },
  { id: "isegahama", name: "Isegahama", ja: "伊勢ヶ濱", description: "Currently dominant in the Makuuchi division with top-tier talent." },
];

export default function NewGameWizard() {
  const navigate = useNavigate();
  const { createWorld, state } = useGame() as any;

  useEffect(() => {
    if (!state.world) {
      createWorld(makeDeterministicSeed("world"));
    }
  }, [state.world]);

  const [step, setStep] = useState(1);
  const [oyakataName, setOyakataName] = useState("");
  const [background, setBackground] = useState(OYAKATA_BACKGROUNDS[0].id);
  const [ichimon, setIchimon] = useState(ICHIMON_FACTIONS[0].id);
  const [selectedHeyaId, setSelectedHeyaId] = useState<string | null>(null);

  const world = state.world;
  const stables = useMemo<Heya[]>(() => (!world ? [] : Array.from(world.heyas.values())), [world]);

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = () => {
    if (!world || !selectedHeyaId) return;
    createWorld(world.seed, selectedHeyaId, {
      name: oyakataName || "Player",
      background,
      ichimon,
      heyaId: selectedHeyaId,
    });
    setStep(4);
  };

  const handleExhibitionComplete = () => {
    navigate({ to: "/" });
  };

  if (!world) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 hero-gradient">
        <div className="h-16 w-16 bg-primary rounded-full animate-ping opacity-20 mb-6" />
        <p className="text-sm font-display font-black uppercase tracking-widest opacity-50">Forging World Seed...</p>
      </div>
    );
  }

  const currentBg = OYAKATA_BACKGROUNDS.find(b => b.id === background)!;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center hero-gradient scroll-smooth">
      <Helmet>
        <title>New Career Setup | Basho</title>
      </Helmet>

      {/* ═══ HERO HEADER ═══ */}
      <section className="w-full bg-primary pt-16 pb-12 px-6 overflow-hidden flex flex-col items-center text-center shadow-2xl relative">
         <div className="absolute top-0 opacity-5 font-display text-[15vw] font-black pointer-events-none uppercase tracking-tighter leading-none -mt-10">
            INAUGURATION
         </div>
         
         <div className="relative z-10 space-y-4">
            <div className="h-14 w-14 bg-white/10 rounded-full mx-auto flex items-center justify-center border border-white/20 animate-in zoom-in duration-500">
               <History className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-4xl font-display font-black tracking-tight text-white uppercase sumi-e-ink">Begin Your Legacy</h1>
            <div className="flex items-center gap-1 justify-center">
               {[1, 2, 3, 4].map((s) => (
                 <div key={s} className={cn("h-1 rounded-full transition-all duration-500", s === step ? "w-12 bg-white" : "w-6 bg-white/20")} />
               ))}
            </div>
         </div>
      </section>

      <main className="max-w-4xl w-full px-6 -mt-8 relative z-20 pb-32">
        
        {/* ── STEP 1: IDENTITY ── */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="glass rounded-lg p-8 shadow-2xl border-2 border-primary/10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary/10 rounded-lg">
                     <CircleUser className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-display font-black uppercase tracking-tight">Establish Your Identity</h2>
                     <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">Association Registry Phase 1</p>
                  </div>
               </div>

               <div className="space-y-10">
                  <div className="space-y-3">
                    <Label htmlFor="oyakataName" className="pro-header">Official Elder Name (Toshiyori-mei)</Label>
                    <Input
                      id="oyakataName"
                      placeholder="e.g. Takanohana"
                      value={oyakataName}
                      onChange={(e) => setOyakataName(e.target.value)}
                      className="h-16 text-2xl font-display font-black border-2 focus:border-primary px-6 rounded-lg shadow-inner bg-muted/30"
                    />
                    <p className="text-xs text-muted-foreground italic font-medium opacity-60">This name will be inscribed in the Association's professional directory.</p>
                  </div>

                  <div className="space-y-4">
                    <Label className="pro-header">Professional History & Background</Label>
                    <div className="grid gap-4 md:grid-cols-3">
                      {OYAKATA_BACKGROUNDS.map((bg) => {
                        const Icon = bg.icon;
                        const isSelected = background === bg.id;
                        return (
                          <div
                            key={bg.id}
                            className={cn(
                              "relative dossier-paper p-5 rounded-lg cursor-pointer transition-all hover:scale-[1.02] overflow-hidden",
                              isSelected ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl" : "opacity-70 hover:opacity-100"
                            )}
                            onClick={() => setBackground(bg.id)}
                          >
                             <div className="absolute -top-2 -right-2 opacity-5 font-display text-4xl font-black">{bg.labelJa}</div>
                             <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                                <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                             </div>
                             <div className="font-display font-black text-lg mb-1">{bg.label}</div>
                             <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 mb-4">{bg.description}</p>
                             <div className="pt-2 border-t border-dashed mt-auto">
                                <div className="text-[8px] font-black uppercase tracking-widest text-primary">Initial Endowment</div>
                                <div className="text-xs font-black">{formatYenToMan(bg.bonuses.funds)}</div>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext} disabled={!oyakataName.trim()} className="h-16 px-10 gap-3 font-display font-black uppercase tracking-widest text-lg shadow-2xl rounded-lg hover:scale-105 transition-transform">
                Next Submission <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: FACTION ── */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
            <div className="glass rounded-lg p-8 shadow-2xl border-2 border-primary/10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary/10 rounded-lg">
                     <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-display font-black uppercase tracking-tight">Choose Your Ichimon</h2>
                     <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">Faction Alignment Phase 2</p>
                  </div>
               </div>

               <div className="grid gap-4 md:grid-cols-2">
                 {ICHIMON_FACTIONS.map((faction) => {
                   const isSelected = ichimon === faction.id;
                   return (
                     <div
                       key={faction.id}
                       className={cn(
                         "dossier-paper p-6 rounded-lg cursor-pointer transition-all group relative overflow-hidden",
                         isSelected ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl" : "opacity-70 hover:opacity-100"
                       )}
                       onClick={() => setIchimon(faction.id)}
                     >
                       <div className="absolute top-2 right-4 opacity-5 font-display text-4xl font-black">{faction.ja}</div>
                       <div className="flex items-center gap-3 mb-2">
                          <CheckCircle2 className={cn("h-5 w-5", isSelected ? "text-primary scale-125" : "opacity-20")} />
                          <h3 className="font-display font-black text-xl tracking-tight">{faction.name}</h3>
                       </div>
                       <p className="text-xs text-muted-foreground leading-relaxed pl-8 italic">"{faction.description}"</p>
                     </div>
                   );
                 })}
               </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={handlePrev} className="h-16 px-8 gap-3 font-display font-black uppercase tracking-widest text-muted-foreground">
                <ArrowLeft className="w-5 h-5" /> Back
              </Button>
              <Button onClick={handleNext} className="h-16 px-10 gap-3 font-display font-black uppercase tracking-widest text-lg shadow-2xl rounded-lg hover:scale-105 transition-transform">
                Verify Allegiance <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: STABLE ── */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
            <div className="glass rounded-lg p-8 shadow-2xl border-2 border-primary/10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary/10 rounded-lg">
                     <Building className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-display font-black uppercase tracking-tight">Acquire a Professional Stable</h2>
                     <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">Property Acquisition Phase 3</p>
                  </div>
               </div>

               <ScrollArea className="h-[500px] pr-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {stables.map((heya: Heya) => (
                      <div
                        key={heya.id}
                        className={cn(
                          "dossier-paper p-5 rounded-lg cursor-pointer transition-all relative overflow-hidden group",
                          selectedHeyaId === heya.id ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl" : "opacity-80 hover:opacity-100"
                        )}
                        onClick={() => setSelectedHeyaId(heya.id)}
                      >
                         {selectedHeyaId === heya.id && (
                           <div className="absolute top-0 right-0 bg-primary text-white p-2 rounded-bl-xl shadow-lg z-10">
                              <CheckCircle2 className="h-4 w-4" />
                           </div>
                         )}
                         <div className="space-y-3">
                            <div>
                               <div className="font-display font-black text-xl tracking-tight group-hover:text-primary transition-colors">{heya.name}</div>
                               <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{heya.location || "Tokyo"} • {heya.rikishiIds?.length || 0} Professional Wrestlers</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                               <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest h-5 bg-primary/10 border-primary/20 text-primary">{heya.statureBand}</Badge>
                               <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-5 border-2">{(heya as any).facilitiesBand}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 italic italic">"{(heya as any).descriptor || 'A stable with a long-standing history of training excellence.'}"</p>
                         </div>
                      </div>
                    ))}
                  </div>
               </ScrollArea>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={handlePrev} className="h-16 px-8 gap-3 font-display font-black uppercase tracking-widest text-muted-foreground">
                <ArrowLeft className="w-5 h-5" /> Back
              </Button>
              <Button onClick={handleFinish} disabled={!selectedHeyaId} className="h-16 px-12 gap-3 font-display font-black uppercase tracking-widest text-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] rounded-lg bg-primary text-white hover:scale-105 transition-transform">
                Begin Journey <Sparkles className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}
        {/* ── STEP 4: EXHIBITION BOUT ── */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-10 duration-700">
            <div className="glass rounded-lg shadow-2xl border-2 border-primary/10 overflow-hidden">
              <ExhibitionBout onComplete={handleExhibitionComplete} />
            </div>
          </div>
        )}
      </main>

      {/* Persistence Info Console */}
      <footer className="fixed bottom-0 w-full bg-background/80 border-t border-border/40 py-4 px-8 z-30 animate-in slide-in-from-bottom-5 duration-700 delay-500 fill-mode-both">
         <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-10">
               <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-0.5">Oyakata</p>
                  <p className="font-display font-black text-xs uppercase tracking-tighter">{oyakataName || "UNREGISTERED"}</p>
               </div>
               <div className="hidden md:block w-px h-6 bg-border/40" />
               <div className="hidden md:block">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-0.5">Endowment</p>
                  <p className="font-display font-black text-xs uppercase tracking-tighter text-success">{formatYenToMan(currentBg.bonuses.funds)}</p>
               </div>
               <div className="hidden lg:block w-px h-6 bg-border/40" />
               <div className="hidden lg:block">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-0.5">Allegiance</p>
                  <p className="font-display font-black text-xs uppercase tracking-tighter text-primary">{ICHIMON_FACTIONS.find(f => f.id === ichimon)?.name || "NONE"}</p>
               </div>
            </div>
            <div className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 select-none hidden sm:block">
               Association Record • Year {world.year}
            </div>
         </div>
      </footer>
    </div>
  );
}
