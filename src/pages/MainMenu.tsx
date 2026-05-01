/**
 * MainMenu.tsx
 *
 * Unified Main Entry & Stable Selection Flow.
 * Features a "Rich Aesthetics" Heroic design with Noto Serif JP overlays.
 * Architecturally decomposed into modular sub-components for maintainability.
 */

import { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Dices, ChevronRight, Database } from "lucide-react";

import { makeDeterministicSeed, safeShortSeed } from "@/utils/engineUtils";
import { HeyaCard } from "@/components/menu/HeyaCard";
import { STATURE_CONFIG } from "@/components/menu/statureConfig";
import { SaveSlotManager } from "@/components/menu/SaveSlotManager";
import { HeyaPreview } from "@/components/menu/HeyaPreview";
import { RANK_HIERARCHY, projectHeyaRosterWithAge } from "@/presenters/uiDigest";
import type { Rank } from "@/engine/types/banzuke";
import type { Heya } from "@/engine/types/heya";
import type { StatureBand, StableSelectionMode } from "@/engine/types/narrative";

export default function MainMenu() {
  const navigate = useNavigate();
  const game = useGame();

  const { createWorld, state, loadFromSlot, loadFromAutosave, hasAutosave, getSaveSlots, quickSave } =
    game as {
      createWorld: (seed: string, playerHeyaId?: string) => void;
      state: { world?: { seed: string; heyas: Map<string, Heya> } };
      loadFromSlot: (slot: string) => boolean;
      loadFromAutosave: () => void;
      hasAutosave: () => boolean;
      getSaveSlots: () => unknown[];
      quickSave: () => boolean;
    };

  const [seed, setSeed] = useState("");
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [selectionMode, setSelectionMode] = useState<StableSelectionMode>("recommended");
  const [selectedHeyaId, setSelectedHeyaId] = useState<string | null>(null);
  const [previewHeya, setPreviewHeya] = useState<Heya | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Sync world seed
  useEffect(() => {
    if (!state?.world) {
      const worldSeed = makeDeterministicSeed("world");
      setSeed(worldSeed);
      if (typeof createWorld === "function") createWorld(worldSeed);
    } else if (state.world?.seed && seed !== state.world.seed) {
      setSeed(state.world.seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createWorld is stable from context; seed is managed internally
  }, [state?.world]);

  // Auto-restore from autosave if available
  useEffect(() => {
    if (!state.world && hasAutosave()) {
      loadFromAutosave();
      // Navigate after state updates
      setTimeout(() => {
        if (state.world) {
          navigate({ to: "/dashboard" });
        }
      }, 100);
    }
  }, [state.world, hasAutosave, loadFromAutosave, navigate]);

  const stables = useMemo(() => {
    if (!state?.world) return [];

    return Array.from(state.world.heyas.values()) as Heya[];
  }, [state?.world]);

  const sekitoriCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!state?.world) return map;
    for (const h of state.world.heyas.values() as IterableIterator<Heya>) {
      let count = 0;
      for (const rid of (h.rikishiIds ?? []) as string[]) {
        const r = state.world.rikishi.get(rid);
        if (r && RANK_HIERARCHY[r.rank as Rank]?.isSekitori) count += 1;
      }
      map.set(h.id, count);
    }
    return map;
  }, [state?.world]);

  const recommendedStables = useMemo(() => {
    const groups: Record<StatureBand, Heya[]> = {
      legendary: [],
      powerful: [],
      established: [],
      rebuilding: [],
      fragile: [],
      new: [],
    };
    stables.forEach((h) => groups[h.statureBand]?.push(h));

    // Sort each group by sekitori count
    (Object.keys(groups) as StatureBand[]).forEach((band) => {
      groups[band].sort(
        (a, b) => (sekitoriCounts.get(b.id) ?? 0) - (sekitoriCounts.get(a.id) ?? 0)
      );
    });

    // Curated selection: variety of challenge levels
    const picks: Heya[] = [];
    // Easy: Legendary/Powerful (top tier)
    if (groups.legendary.length > 0) picks.push(groups.legendary[0]);
    else if (groups.powerful.length > 0) picks.push(groups.powerful[0]);

    // Medium: Established (solid choices)
    picks.push(...groups.established.slice(0, 2));

    // Hard: Rebuilding (challenging)
    if (groups.rebuilding.length > 0) picks.push(groups.rebuilding[0]);

    // Very Hard: Fragile/New (extreme challenge)
    if (groups.fragile.length > 0) picks.push(groups.fragile[0]);
    else if (groups.new.length > 0) picks.push(groups.new[0]);

    // Fill remaining slots maintaining variety (round-robin from each band)
    const remainingBands: StatureBand[] = [
      "fragile",
      "new",
      "rebuilding",
      "established",
      "powerful",
      "legendary",
    ];
    let bandIdx = 0;
    while (picks.length < 6 && bandIdx < remainingBands.length * 3) {
      const band = remainingBands[bandIdx % remainingBands.length];
      const bandStables = groups[band];
      const pickCount = picks.filter((p) => p.statureBand === band).length;
      if (bandStables[pickCount]) {
        const next = bandStables[pickCount];
        if (!picks.find((p) => p.id === next.id)) {
          picks.push(next);
        }
      }
      bandIdx++;
    }

    // Final fallback: any remaining stables by sekitori count
    const allSorted = stables.sort(
      (a, b) => (sekitoriCounts.get(b.id) ?? 0) - (sekitoriCounts.get(a.id) ?? 0)
    );
    for (const h of allSorted) {
      if (picks.length >= 6) break;
      if (!picks.find((p) => p.id === h.id)) picks.push(h);
    }

    return picks.slice(0, 6);
  }, [stables, sekitoriCounts]);

  const stablesByStature = useMemo(() => {
    const groups: Record<StatureBand, Heya[]> = {
      legendary: [],
      powerful: [],
      established: [],
      rebuilding: [],
      fragile: [],
      new: [],
    };
    stables.forEach((h) => groups[h.statureBand]?.push(h));
    return groups;
  }, [stables]);

  const handleRerollWorld = () => {
    const newSeed = makeDeterministicSeed("world");
    setSeed(newSeed);
    setSelectedHeyaId(null);
    createWorld(newSeed);
  };

  const handleSetSeed = () => {
    if (!seed.trim()) return;
    createWorld(seed.trim());
    setShowSeedInput(false);
  };

  const beginWithHeya = (heyaId: string) => {
    if (!state?.world) return;
    createWorld(state.world.seed, heyaId);
    // Autosave after world creation completes
    setTimeout(() => {
      if (state.world) {
        quickSave();
      }
    }, 100);
    navigate({ to: "/dashboard" });
  };

  if (!state?.world) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-arena-ground">
        <div className="h-2 w-48 bg-muted rounded-sm overflow-hidden mb-6">
          <div className="h-full bg-primary animate-progress-flow" />
        </div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-gold/60">
          Institutional Interface Initializing...
        </p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>BASHO — Sumo Management Simulator</title>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
        {/* ═══ HERO HEADER ═══ */}
        <section className="w-full relative pt-24 pb-20 px-6 overflow-hidden flex flex-col items-center text-center border-b border-gold/10">
          {/* Background Motif */}
          <div className="absolute inset-0 bg-arena-ground pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none" />

          <div className="absolute top-0 opacity-5 font-display text-[20vw] font-black pointer-events-none uppercase tracking-tighter -mt-20 leading-none sumi-e-ink">
            SUMO BASHO
          </div>

          <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-8">
            <div className="glass paper p-4 rounded flex items-center gap-6 animate-in fade-in slide-in-from-top-10 duration-700">
              <div className="h-20 w-20 paper rounded flex items-center justify-center shadow-md border-gold/30">
                <svg
                  viewBox="0 0 100 100"
                  className="h-14 w-14 text-gold"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M25 45 Q25 85 50 90 Q75 85 75 45 L70 35 L30 35 Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                  <ellipse
                    cx="50"
                    cy="28"
                    rx="8"
                    ry="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                  <path d="M30 35 Q50 32 70 35 L72 50 Q50 48 28 50 Z" fill="currentColor" />
                  <circle
                    cx="50"
                    cy="38"
                    r="6"
                    fill="var(--background)"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M35 48 L32 55 L38 58 L35 65 L41 68"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M42 48 L39 55 L45 58 L42 65 L48 68"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M58 48 L55 55 L61 58 L58 65 L64 68"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M65 48 L62 55 L68 58 L65 65 L71 68"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-left py-2 pr-6 border-r border-border/40">
                <h1 className="text-foreground font-display text-5xl font-bold tracking-tighter leading-none mb-1 uppercase sumi-e-ink">
                  BASHO
                </h1>
                <p className="text-gold font-display text-xl leading-none opacity-80">
                  相撲経営シミュレーション
                </p>
              </div>
              <div className="text-left max-w-[240px]">
                <p className="stat-label text-gold mb-1 tracking-[0.2em]">ASSOCIATION STATUS</p>
                <p className="text-xs text-muted-foreground leading-snug font-body">
                  Assume the mantle of Oyakata. Architect your lineage, refine your technique, and
                  dominate the Kokugikan.
                </p>
              </div>
            </div>

            {/* Career Persistence */}
            <SaveSlotManager
              getSaveSlots={getSaveSlots}
              loadFromSlot={loadFromSlot}
              loadFromAutosave={loadFromAutosave}
              hasAutosave={hasAutosave}
              onLoadSuccess={() => navigate({ to: "/dashboard" })}
              createWorld={createWorld}
              hideArchiveButton
            />
          </div>
        </section>

        <main className="max-w-6xl w-full px-6 -mt-10 relative z-20 pb-24">
          {showSeedInput && (
            <div className="flex justify-center mb-10 -mt-6 animate-in slide-in-from-top-4 duration-300">
              <div className="paper p-2 rounded flex items-center gap-2 w-full max-w-md shadow-md">
                <Input
                  placeholder="Enter specific world seed..."
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="border-0 shadow-none bg-transparent font-mono text-xs h-10"
                />
                <Button
                  size="sm"
                  variant="primary-gradient"
                  onClick={handleSetSeed}
                  className="px-6 h-10"
                >
                  Sync Seed
                </Button>
              </div>
            </div>
          )}

          {/* Heya Selection Tabs */}
          <Tabs
            value={selectionMode}
            onValueChange={(v) => setSelectionMode(v as StableSelectionMode)}
            className="w-full"
          >
            <div className="flex items-center justify-between gap-4 mb-8">
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight sumi-e-ink">
                Select your stable
              </h2>
              <TabsList className="bg-transparent h-12 p-0 gap-8">
                <TabsTrigger
                  value="recommended"
                  className="bg-transparent px-0 pb-2 rounded-none font-mono font-bold uppercase tracking-[0.15em] text-[11px] data-[state=active]:bg-transparent data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold transition-all"
                >
                  Recommended
                </TabsTrigger>
                <TabsTrigger
                  value="take_over"
                  className="bg-transparent px-0 pb-2 rounded-none font-mono font-bold uppercase tracking-[0.15em] text-[11px] data-[state=active]:bg-transparent data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold transition-all"
                >
                  Professional Directory
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="recommended" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recommendedStables.map((heya) => (
                  <HeyaCard
                    key={heya.id}
                    heya={heya}
                    isSelected={selectedHeyaId === heya.id}
                    onSelect={() => setSelectedHeyaId(heya.id)}
                    onPreview={() => setPreviewHeya(heya)}
                    isRecommended
                    sekitoriCount={sekitoriCounts.get(heya.id) ?? 0}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="take_over" className="space-y-8">
              <ScrollArea className="h-[600px] pr-4 no-scrollbar">
                <div className="space-y-12">
                  {(Object.keys(stablesByStature) as StatureBand[]).map((stature) => {
                    const group = stablesByStature[stature];
                    if (group.length === 0 || stature === "new") return null;
                    const config = STATURE_CONFIG[stature];
                    const Icon = config.icon;

                    return (
                      <div key={stature} className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-border/40 pb-2">
                          <div className={cn("p-1.5 rounded", config.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <h3 className="font-display text-xl font-bold uppercase tracking-tight">
                            {config.label} Stables
                            <span className="ml-3 text-[10px] font-mono font-bold text-muted-foreground tracking-widest opacity-60">
                              / {group.length} Professional Stables
                            </span>
                          </h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {group
                            .sort(
                              (a, b) =>
                                (sekitoriCounts.get(b.id) ?? 0) - (sekitoriCounts.get(a.id) ?? 0)
                            )
                            .map((heya) => (
                              <HeyaCard
                                key={heya.id}
                                heya={heya}
                                isSelected={selectedHeyaId === heya.id}
                                onSelect={() => setSelectedHeyaId(heya.id)}
                                onPreview={() => setPreviewHeya(heya)}
                                sekitoriCount={sekitoriCounts.get(heya.id) ?? 0}
                              />
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer Sticky Bar */}
          {selectedHeyaId && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 z-50 animate-in slide-in-from-bottom-10 duration-500">
              <div className="glass paper p-2 pl-6 rounded shadow-xl flex items-center justify-between border-gold/30">
                <div className="text-foreground min-w-0 pr-4">
                  <p className="stat-label text-gold tracking-[0.2em] mb-0.5">READY TO BEGIN</p>
                  <p className="font-display text-xl font-bold truncate sumi-e-ink uppercase">
                    {stables.find((h) => h.id === selectedHeyaId)?.name} Stable
                  </p>
                </div>
                <Button
                  size="lg"
                  variant="primary-gradient"
                  className="h-14 px-10 gap-3 text-sm shadow-md"
                  onClick={() => beginWithHeya(selectedHeyaId)}
                >
                  Inaugurate <ChevronRight className="h-5 w-5 stroke-[3]" />
                </Button>
              </div>
            </div>
          )}
        </main>

        <HeyaPreview
          heya={previewHeya}
          onClose={() => setPreviewHeya(null)}
          onConfirm={beginWithHeya}
          sekitoriCount={previewHeya ? (sekitoriCounts.get(previewHeya.id) ?? 0) : 0}
          rosterWithAge={
            previewHeya && state.world ? projectHeyaRosterWithAge(state.world, previewHeya.id) : []
          }
        />

        <footer className="w-full border-t border-border/20 py-8 px-6 flex flex-col items-center gap-6 bg-arena-ground">
          {/* World Generation Controls */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            <div className="space-y-1">
              <p className="stat-label text-gold/60">WORLD SEED</p>
              <p className="font-mono text-xs text-gold tracking-widest uppercase">
                {safeShortSeed(state.world.seed)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[10px] font-mono font-bold uppercase tracking-widest"
                onClick={handleRerollWorld}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Reroll World
              </Button>
              <Button
                variant={showSeedInput ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-[10px] font-mono font-bold uppercase tracking-widest"
                onClick={() => setShowSeedInput(!showSeedInput)}
              >
                <Dices className="h-3.5 w-3.5 mr-2" /> {showSeedInput ? "Hide Seed" : "Manual Seed"}
              </Button>
            </div>
          </div>

          <div className="w-full max-w-md h-px bg-gold/10" />

          {/* Archive & Copyright */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition-colors"
              onClick={() => document.getElementById("archive-trigger")?.click()}
            >
              <Database className="w-3.5 h-3.5" />
              Career Archives
            </Button>
          </div>
          <div className="text-center space-y-2">
            <p className="text-[10px] font-display font-bold uppercase tracking-[0.4em] text-gold/30">
              Reach the Summit — 頂点を目指せ
            </p>
            <p className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
              © 2026 Sumo Manager Pro · Institutional Grade Simulation
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
