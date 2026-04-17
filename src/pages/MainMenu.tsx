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
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Dices, ChevronRight } from "lucide-react";

import { makeDeterministicSeed, safeShortSeed } from "@/utils/engineUtils";
import { HeyaCard, STATURE_CONFIG } from "@/components/menu/HeyaCard";
import { SaveSlotManager } from "@/components/menu/SaveSlotManager";
import { HeyaPreview } from "@/components/menu/HeyaPreview";
import { RANK_HIERARCHY, projectHeyaRosterWithAge } from "@/presenters/uiDigest";
import type { Heya } from "@/engine/types/heya";
import type { StatureBand, StableSelectionMode } from "@/engine/types/narrative";

export default function MainMenu() {
  const navigate = useNavigate();
  const game = useGame();

  const { createWorld, state, loadFromSlot, loadFromAutosave, hasAutosave, getSaveSlots } =
    game as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [seed, setSeed] = useState("");
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [selectionMode, setSelectionMode] = useState<StableSelectionMode>("recommended");
  const [selectedHeyaId, setSelectedHeyaId] = useState<string | null>(null);
  const [previewHeya, setPreviewHeya] = useState<Heya | null>(null);

  // Sync world seed
  useEffect(() => {
    if (!state?.world) {
      const worldSeed = makeDeterministicSeed("world");
      setSeed(worldSeed);
      if (typeof createWorld === "function") createWorld(worldSeed);
    } else if (state.world?.seed && seed !== state.world.seed) {
      setSeed(state.world.seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally omitting createWorld and seed
  }, [state?.world]);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RANK_HIERARCHY type mismatch
        if (r && (RANK_HIERARCHY as any)?.[r.rank]?.isSekitori) count += 1;
      }
      map.set(h.id, count);
    }
    return map;
  }, [state?.world]);

  const recommendedStables = useMemo(() => {
    return stables
      .filter((h) => h.statureBand === "established" || h.statureBand === "powerful")
      .sort((a, b) => (sekitoriCounts.get(b.id) ?? 0) - (sekitoriCounts.get(a.id) ?? 0))
      .slice(0, 6);
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
    navigate({ to: "/dashboard" });
  };

  if (!state?.world) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="h-16 w-16 bg-primary rounded-full animate-ping opacity-20 mb-6" />
        <p className="text-sm font-display font-black uppercase tracking-widest opacity-50">
          Initializing Basho Engine...
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
        <section className="w-full bg-primary relative pt-24 pb-20 px-6 overflow-hidden flex flex-col items-center text-center shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 opacity-10 font-display text-[20vw] font-black pointer-events-none uppercase tracking-tighter -mt-20 leading-none">
            SUMO BASHO
          </div>

          <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-6">
            <div className="bg-white/5 border border-white/10 p-4 rounded-lg flex items-center gap-6 shadow-inner animate-in fade-in slide-in-from-top-10 duration-700">
              <div className="h-20 w-20 bg-white rounded-lg flex items-center justify-center shadow-2xl">
                <svg
                  viewBox="0 0 100 100"
                  className="h-14 w-14 text-primary"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Apron base (kesho mawashi silhouette) */}
                  <path
                    d="M25 45 Q25 85 50 90 Q75 85 75 45 L70 35 L30 35 Z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                  {/* Shimekomi rope loop at back */}
                  <ellipse
                    cx="50"
                    cy="28"
                    rx="8"
                    ry="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                  {/* Main shimekomi belt */}
                  <path d="M30 35 Q50 32 70 35 L72 50 Q50 48 28 50 Z" fill="currentColor" />
                  {/* The knot */}
                  <circle
                    cx="50"
                    cy="38"
                    r="6"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  {/* Shide zigzag streamers - left side */}
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
                  {/* Shide zigzag streamers - right side */}
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
                  {/* Apron decorative pattern hints */}
                  <path
                    d="M35 75 Q50 78 65 75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.5"
                    fill="none"
                  />
                  <path
                    d="M38 82 Q50 85 62 82"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.5"
                    fill="none"
                  />
                </svg>
              </div>
              <div className="text-left py-2 pr-6 border-r border-white/10">
                <h1 className="text-primary-foreground font-display text-5xl font-black tracking-tighter leading-none mb-1 uppercase">
                  BASHO
                </h1>
                <p className="text-primary-foreground/60 font-display text-xl leading-none">
                  相撲経営シミュレーション
                </p>
              </div>
              <div className="text-left opacity-80 max-w-[240px]">
                <p className="text-[10px] text-primary-foreground/70 font-black uppercase tracking-widest mb-1">
                  Association Status
                </p>
                <p className="text-xs text-primary-foreground leading-snug">
                  Become the Oyakata of your own heya. Recruit, train, and dominate the Kokugikan.
                </p>
              </div>
            </div>

            {/* Career Persistence */}
            <SaveSlotManager
              getSaveSlots={getSaveSlots}
              loadFromSlot={loadFromSlot}
              loadFromAutosave={loadFromAutosave}
              hasAutosave={hasAutosave}
              onLoadSuccess={() => navigate({ to: "/" })}
              createWorld={createWorld}
            />
          </div>

          {/* Hero Decoration */}
          <div className="absolute bottom-0 left-0 w-full flex justify-between px-20 translate-y-1/2 opacity-20 pointer-events-none">
            <div className="h-64 w-64 border-8 border-white/20 rounded-full" />
            <div className="h-64 w-64 border-8 border-white/20 rounded-full" />
          </div>
        </section>

        <main className="max-w-6xl w-full px-6 -mt-12 relative z-20 pb-20">
          {/* World Settings Console */}
          <div className="glass rounded-lg p-4 flex items-center justify-between gap-4 mb-8 shadow-2xl animate-in slide-in-from-bottom-5 duration-700 delay-300 fill-mode-both">
            <div className="flex items-center gap-6 pl-4 border-l-4 border-primary">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  World Generation
                </p>
                <p className="font-display font-black text-sm uppercase tracking-tighter">
                  Deterministic Seed:{" "}
                  <span className="text-primary">{safeShortSeed(state.world.seed)}</span>
                </p>
              </div>
              <div className="hidden md:block h-8 w-px bg-border/20" />
              <div className="hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  Heya Directory
                </p>
                <p className="font-display font-black text-sm uppercase tracking-tighter">
                  {stables.length} Professional Stables
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 gap-2 font-bold uppercase tracking-widest text-[10px] border-2"
                onClick={handleRerollWorld}
              >
                <RefreshCw className="h-3 w-3" /> Reroll
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 px-3 gap-2 font-bold uppercase tracking-widest text-[10px] border-2 ${showSeedInput ? "bg-primary text-white border-primary" : ""}`}
                onClick={() => setShowSeedInput(!showSeedInput)}
              >
                <Dices className="h-3 w-3" /> {showSeedInput ? "Apply Seed" : "Manual Seed"}
              </Button>
            </div>
          </div>

          {showSeedInput && (
            <div className="flex justify-center mb-10 -mt-6 animate-in slide-in-from-top-4 duration-300">
              <div className="bg-muted p-2 rounded-lg border-2 flex items-center gap-2 w-full max-w-md shadow-lg">
                <Input
                  placeholder="Enter specific world seed..."
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="border-0 shadow-none bg-transparent font-mono text-sm h-10"
                />
                <Button
                  size="sm"
                  onClick={handleSetSeed}
                  className="font-black uppercase tracking-widest px-6 h-10"
                >
                  Sync
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
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="font-display text-2xl font-black uppercase tracking-tight">
                Select your stable
              </h2>
              <TabsList className="bg-muted/50 p-1 rounded-full border border-border/50">
                <TabsTrigger
                  value="recommended"
                  className="rounded-full px-6 font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  Recommended
                </TabsTrigger>
                <TabsTrigger
                  value="take_over"
                  className="rounded-full px-6 font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white"
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
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-12">
                  {(Object.keys(stablesByStature) as StatureBand[]).map((stature) => {
                    const group = stablesByStature[stature];
                    if (group.length === 0 || stature === "new") return null;
                    const config = STATURE_CONFIG[stature];
                    const Icon = config.icon;

                    return (
                      <div key={stature} className="space-y-4">
                        <div className="flex items-center gap-3 border-b-2 border-border/20 pb-2">
                          <div className={`p-2 rounded-lg ${config.color} border-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="font-display text-xl font-black uppercase tracking-tight">
                            {config.label} Stables{" "}
                            <span className="text-muted-foreground font-bold opacity-30">
                              — {group.length} Professional Stables
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
              <div className="bg-primary p-2 pl-6 rounded-full shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] flex items-center justify-between border border-white/20">
                <div className="text-primary-foreground min-w-0 pr-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                    Ready to begin
                  </p>
                  <p className="font-display text-xl font-black truncate">
                    {stables.find((h) => h.id === selectedHeyaId)?.name} Stable
                  </p>
                </div>
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 rounded-full h-14 px-10 gap-3 font-display font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform"
                  onClick={() => beginWithHeya(selectedHeyaId)}
                >
                  Inaugurate <ChevronRight className="h-6 w-6 stroke-[3]" />
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

        <footer className="w-full border-t border-border/20 py-12 px-6 flex flex-col items-center opacity-30 gap-1">
          <p className="text-xs font-black uppercase tracking-[0.4em]">
            Reach the Summit — 頂点を目指せ
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2026 Sumo Manager Pro | Professional Stable Management Simulator
          </p>
        </footer>
      </div>
    </>
  );
}
