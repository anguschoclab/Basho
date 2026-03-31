/**
 * RecapPage.tsx
 * 
 * Post-Basho Narrative Recap & Association Wrappers.
 * Architecturally decomposed into modular ceremonial and narrative sub-components.
 * Features a high-fidelity "Rich Aesthetics" orchestration.
 */

import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight,
  ChevronRight,
  History,
  Info
} from "lucide-react";

import { TournamentCeremony } from "@/components/recap/TournamentCeremony";
import { NarrativeSummary } from "@/components/recap/NarrativeSummary";
import { PressConference } from "@/components/game/PressConference";
import { YokozunaDeliberation } from "@/components/game/YokozunaDeliberation";
import { HoFInductionCeremony } from "@/components/game/HoFInductionCeremony";
import type { EngineEvent } from "@/engine/types/events";
import type { HoFInductee } from "@/engine/hallOfFame";
import { getHallOfFame } from "@/presenters/uiDigest";

// Helper utilities for the Recap Page logic
function getBashoWrapEvents(events: EngineEvent[], bashoNumber?: number): EngineEvent[] {
  return events.filter(e => 
    (e.phase === "basho_wrap" || e.category === "basho" || e.category === "career" || e.category === "promotion") &&
    (bashoNumber === undefined || e.bashoNumber === bashoNumber)
  ).slice(-50);
}

function groupEventsByNarrative(events: EngineEvent[]) {
  const groups: Record<string, EngineEvent[]> = {
    yusho: [], promotions: [], retirements: [], injuries: [], governance: [], sponsors: [], other: []
  };
  for (const e of events) {
    if (e.type.includes("YUSHO") || e.type.includes("CHAMPIONSHIP")) groups.yusho.push(e);
    else if (e.category === "promotion" || e.type.includes("PROMOTION") || e.type.includes("DEMOTION")) groups.promotions.push(e);
    else if (e.type.includes("RETIRE") || e.category === "career") groups.retirements.push(e);
    else if (e.category === "injury") groups.injuries.push(e);
    else if (e.category === "discipline" || e.type.includes("GOVERNANCE")) groups.governance.push(e);
    else if (e.category === "sponsor") groups.sponsors.push(e);
    else groups.other.push(e);
  }
  return groups;
}

function getPrestigeChanges(world: any): Array<{ heya: any; change: string }> {
  const changes: Array<{ heya: any; change: string }> = [];
  if (!world?.heyas) return changes;
  const prestige_events = (world.events?.log || []).filter((e: EngineEvent) => 
    e.type.includes("PRESTIGE") || e.type.includes("STATURE") || e.category === "milestone"
  ).slice(-20);
  for (const e of prestige_events) {
    if (e.heyaId) {
      const heya = world.heyas.get(e.heyaId);
      if (heya) changes.push({ heya, change: e.summary });
    }
  }
  return changes;
}

export default function RecapPage() {
  const { state, setPhase, updateWorld } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const [showPressConference, setShowPressConference] = useState(false);
  const [showYokozunaDelib, setShowYokozunaDelib] = useState(false);
  const [showHoFCeremony, setShowHoFCeremony] = useState<HoFInductee | null>(null);

  const handleContinue = () => {
    setPhase("interim");
    navigate({ to: "/dashboard" });
  };

  const handlePressConferenceClose = (effects: { reputation: number; morale: number; mediaHeat: number }) => {
    setShowPressConference(false);
    if (world && world.playerHeyaId) {
      const heya = world.heyas.get(world.playerHeyaId);
      if (heya) {
        heya.reputation = Math.max(0, Math.min(100, (heya.reputation ?? 50) + effects.reputation));
      }
      updateWorld({ ...world });
    }
  };

  const newInductees = useMemo(() => {
    if (!world) return [];
    return getHallOfFame(world).inductees.filter(i => i.inductionYear === world.year);
  }, [world]);

  if (!world) return null;

  const lastBasho = world.history?.[world.history.length - 1];
  const events = world.events?.log || [];
  const bashoEvents = getBashoWrapEvents(events, lastBasho?.bashoNumber);
  const groupedEvents = groupEventsByNarrative(bashoEvents);
  const prestigeChanges = getPrestigeChanges(world);
  
  const dashboardTabs = [
    { id: "overview", label: "Overview", href: "/dashboard" },
    { id: "basho", label: "Basho", href: "/basho" },
    { id: "recap", label: "Recap" },
    { id: "history", label: "History", href: "/history" },
    { id: "almanac", label: "Almanac", href: "/almanac" },
  ];

  const bashoTitle = lastBasho?.bashoName?.toUpperCase() || "RECENT";

  return (
    <AppLayout pageTitle="Post-Basho Recap" subNavTabs={dashboardTabs} activeSubTab="recap">
      <Helmet>
        <title>{bashoTitle} Recap | Basho</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* ═══ HERO SECTION ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-2 border-border/20">
           <div>
              <div className="flex items-center gap-3 mb-1">
                 <div className="h-10 w-2 bg-primary rounded-full" />
                 <h1 className="text-5xl font-display font-black tracking-tight uppercase sumi-e-ink">Basho Recap</h1>
              </div>
              <p className="text-sm font-medium text-muted-foreground opacity-70 flex items-center gap-2">
                 <History className="h-4 w-4" /> {bashoTitle} {world.year} — The official ceremonial summary and world drift ledger.
              </p>
           </div>
           
           <div className="flex gap-3">
              <Button variant="outline" className="h-12 px-6 font-black uppercase tracking-widest border-2" onClick={() => setShowPressConference(true)}>
                 Press Conference
              </Button>
              <Button className="h-12 px-10 gap-3 font-display font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={handleContinue}>
                 Finalize Basho <ChevronRight className="h-5 w-5" />
              </Button>
           </div>
        </div>

        {/* ═══ CEREMONIAL LAYER ═══ */}
        <TournamentCeremony lastBasho={lastBasho} world={world} />

        {/* ═══ NARRATIVE LAYER ═══ */}
        <div className="pt-12">
           <div className="flex items-center gap-4 mb-10">
              <h2 className="text-3xl font-display font-black uppercase tracking-tighter">Association Drift</h2>
              <div className="h-px flex-1 bg-border/20" />
           </div>
           <NarrativeSummary 
             groupedEvents={groupedEvents} 
             prestigeChanges={prestigeChanges} 
             world={world} 
           />
        </div>

        {/* ═══ MODALS & CEREMONIES ═══ */}
        {showPressConference && (
          <PressConference 
            heya={world.heyas.get(world.playerHeyaId!)} 
            onClose={handlePressConferenceClose} 
          />
        )}

        {showYokozunaDelib && (
          <YokozunaDeliberation 
            onClose={() => setShowYokozunaDelib(false)} 
          />
        )}

        {showHoFCeremony && (
          <HoFInductionCeremony 
            inductee={showHoFCeremony} 
            onClose={() => setShowHoFCeremony(null)} 
          />
        )}
      </div>

      {/* Floating Action Button for persistence */}
      <div className="fixed bottom-10 right-10 z-50">
         <Button 
           size="lg" 
           className="h-16 w-16 rounded-full shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] border-4 border-white/20 p-0"
           onClick={handleContinue}
           title="Finalize Basho"
         >
            <ArrowRight className="h-8 w-8" />
         </Button>
      </div>

    </AppLayout>
  );
}
