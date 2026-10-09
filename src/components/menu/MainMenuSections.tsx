/**
 * MainMenuSections.tsx
 *
 * MainMenu sections — hero header with crest + career persistence,
 * the world-seed input, and the stable-selection tabs.
 */

import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useGame } from "@/contexts/useGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeyaCard } from "@/components/menu/HeyaCard";
import { STATURE_CONFIG } from "@/components/menu/statureConfig";
import { SaveSlotManager } from "@/components/menu/SaveSlotManager";
import type { Heya } from "@/engine/types/heya";
import type { StatureBand, StableSelectionMode } from "@/engine/types/narrative";
import type { useMainMenuState } from "@/hooks/useMainMenuState";

type State = ReturnType<typeof useMainMenuState>;

/** BASHO crest mark. */
function BashoCrest() {
  return (
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
  );
}

/** Hero header — crest, title, status copy, and career persistence. */
export function MainMenuHero({ game }: { game: ReturnType<typeof useGame> }) {
  const navigate = useNavigate();
  return (
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
            <BashoCrest />
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
          getSaveSlots={game.getSaveSlots}
          loadFromSlot={game.loadFromSlot}
          loadFromAutosave={game.loadFromAutosave}
          hasAutosave={game.hasAutosave}
          onLoadSuccess={() => navigate({ to: "/dashboard" })}
          loadWorldDirect={game.loadWorldDirect}
          hideArchiveButton
        />
      </div>
    </section>
  );
}

/** Optional world-seed input row. */
export function SeedInputRow({ state }: { state: State }) {
  return (
    <div className="flex justify-center mb-10 -mt-6 animate-in slide-in-from-top-4 duration-300">
      <div className="paper p-2 rounded flex items-center gap-2 w-full max-w-md shadow-md">
        <Input
          placeholder="Enter specific world seed..."
          value={state.seed}
          onChange={(e) => state.setSeed(e.target.value)}
          className="border-0 shadow-none bg-transparent font-mono text-xs h-10"
        />
        <Button
          size="sm"
          variant="primary-gradient"
          onClick={state.handleSetSeed}
          className="px-6 h-10"
        >
          Sync Seed
        </Button>
      </div>
    </div>
  );
}

const TRIGGER_CLASSES =
  "bg-transparent px-0 pb-2 rounded-none font-mono font-bold uppercase tracking-[0.15em] text-[11px] data-[state=active]:bg-transparent data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold transition-all";

/** Stables grouped by stature band for the directory tab. */
function StatureGroups({ state }: { state: State }) {
  return (
    <div className="space-y-12">
      {(Object.keys(state.stablesByStature) as StatureBand[]).map((stature) => {
        const group = state.stablesByStature[stature];
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
                    (state.sekitoriCounts.get(b.id) ?? 0) - (state.sekitoriCounts.get(a.id) ?? 0)
                )
                .map((heya: Heya) => (
                  <HeyaCard
                    key={heya.id}
                    heya={heya}
                    isSelected={state.selectedHeyaId === heya.id}
                    onSelect={() => state.setSelectedHeyaId(heya.id)}
                    onPreview={() => state.setPreviewHeya(heya)}
                    sekitoriCount={state.sekitoriCounts.get(heya.id) ?? 0}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Recommended / directory stable-selection tabs. */
export function StableSelectionTabs({ state }: { state: State }) {
  return (
    <Tabs
      value={state.selectionMode}
      onValueChange={(v) => state.setSelectionMode(v as StableSelectionMode)}
      className="w-full"
    >
      <div className="flex items-center justify-between gap-4 mb-8">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight sumi-e-ink">
          Select your stable
        </h2>
        <TabsList className="bg-transparent h-12 p-0 gap-8">
          <TabsTrigger value="recommended" className={TRIGGER_CLASSES}>
            Recommended
          </TabsTrigger>
          <TabsTrigger value="take_over" className={TRIGGER_CLASSES}>
            Professional Directory
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="recommended" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {state.recommendedStables.map((heya) => (
            <HeyaCard
              key={heya.id}
              heya={heya}
              isSelected={state.selectedHeyaId === heya.id}
              onSelect={() => state.setSelectedHeyaId(heya.id)}
              onPreview={() => state.setPreviewHeya(heya)}
              isRecommended
              sekitoriCount={state.sekitoriCounts.get(heya.id) ?? 0}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="take_over" className="space-y-8">
        <ScrollArea className="h-[600px] pr-4 no-scrollbar">
          <StatureGroups state={state} />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
