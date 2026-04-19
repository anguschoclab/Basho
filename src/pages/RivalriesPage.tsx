import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { Card, CardContent } from "@/components/ui/card";
import { TOURNAMENT_TABS } from "@/constants/navigation";
import { useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Users, Flame, Swords } from "lucide-react";
import type { RivalryPairState } from "@/engine/rivalries";
import { createDefaultRivalriesState, type RivalriesState } from "@/engine/rivalries";
import { RivalriesHeader } from "@/components/rivalries/RivalriesHeader";
import { RivalryCard } from "@/components/rivalries/RivalryCard";
import { RivalriesEmptyState } from "@/components/rivalries/RivalriesEmptyState";
import { HeatLegend } from "@/components/rivalries/HeatLegend";

// Page
/** rivalries page. */
export default function RivalriesPage() {
  const { state } = useGame();
  const { world, playerHeyaId } = state;
  const [searchQuery, setSearchQuery] = useState("");

  const rivalriesState = useMemo<RivalriesState>(() => {
    if (!world) return createDefaultRivalriesState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WorldState type mismatch
    const rs = (world as any).rivalries;
    return rs && typeof rs === "object" && rs.pairs ? rs : createDefaultRivalriesState();
  }, [world]);

  const playerRikishiIds = useMemo(() => {
    if (!world || !playerHeyaId) return new Set<string>();
    const heya = world.heyas.get(playerHeyaId);
    return new Set(heya?.rikishiIds ?? []);
  }, [world, playerHeyaId]);

  const { playerRivalries, hotRivalries, coolRivalries, stats } = useMemo(() => {
    const rawPairs = Object.values(rivalriesState.pairs);
    const normalized: RivalryPairState[] = rawPairs
      .filter(
        (p) => p && typeof p === "object" && typeof p.aId === "string" && typeof p.bId === "string"
      )
      .map((p) => ({
        ...p,
        heat: Math.max(0, Math.min(100, Number(p.heat) || 0)),
        aWins: p.aWins || 0,
        bWins: p.bWins || 0,
        triggers: p.triggers || {},
        tone: p.tone || "respect",
      })) as RivalryPairState[];

    // Search filter
    const filtered = searchQuery
      ? normalized.filter((p) => {
          const a = world?.rikishi.get(p.aId);
          const b = world?.rikishi.get(p.bId);
          const q = searchQuery.toLowerCase();
          return a?.shikona?.toLowerCase().includes(q) || b?.shikona?.toLowerCase().includes(q);
        })
      : normalized;

    const player: RivalryPairState[] = [];
    const hot: RivalryPairState[] = [];
    const cool: RivalryPairState[] = [];

    for (const pair of filtered) {
      const isPlayer = playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId);
      if (isPlayer) player.push(pair);
      else if ((pair.heat ?? 0) >= 55) hot.push(pair);
      else cool.push(pair);
    }

    const byHeat = (a: RivalryPairState, b: RivalryPairState) => (b.heat ?? 0) - (a.heat ?? 0);
    player.sort(byHeat);
    hot.sort(byHeat);
    cool.sort(byHeat);

    const { infernoCount, hotCount } = normalized.reduce(
      (acc, p) => {
        const heat = p.heat ?? 0;
        if (heat >= 80) acc.infernoCount++;
        else if (heat >= 55) acc.hotCount++;
        return acc;
      },
      { infernoCount: 0, hotCount: 0 }
    );

    return {
      playerRivalries: player,
      hotRivalries: hot,
      coolRivalries: cool,
      stats: { total: normalized.length, inferno: infernoCount, hot: hotCount },
    };
  }, [rivalriesState, playerRikishiIds, searchQuery, world]);

  if (!world) {
    return (
      <AppLayout pageTitle="Rivalries & Feuds">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No world loaded.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const hasRivalries = stats.total > 0;

  return (
    <AppLayout pageTitle="Rivalries & Feuds" subNavTabs={TOURNAMENT_TABS} activeSubTab="rivalries">
      <Helmet>
        <title>Rivalries & Feuds - Basho</title>
      </Helmet>

      <div className="space-y-6 animate-fade-in">
        <PageHeader
          eyebrow="── TOURNAMENT ──"
          title="Rivalries & Feuds"
          lede="Tension, history, and blood feuds across the dohyo."
        />
        <RivalriesHeader
          stats={stats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery("")}
        />

        {!hasRivalries ? (
          <RivalriesEmptyState />
        ) : (
          <>
            {playerRivalries.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Your Stable's Rivalries
                  <span className="text-xs text-muted-foreground font-normal">
                    ({playerRivalries.length})
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {playerRivalries.map((pair, i) => (
                    <RivalryCard
                      key={pair.key}
                      pair={pair}
                      world={world}
                      isPlayerRivalry
                      index={i}
                    />
                  ))}
                </div>
              </section>
            )}

            {hotRivalries.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent" />
                  Hot Rivalries Across Sumo
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {hotRivalries.slice(0, 8).map((pair, i) => (
                    <RivalryCard key={pair.key} pair={pair} world={world} index={i} />
                  ))}
                </div>
              </section>
            )}

            {coolRivalries.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                  <Swords className="h-4 w-4" />
                  Developing Rivalries
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {coolRivalries.slice(0, 8).map((pair, i) => (
                    <RivalryCard
                      key={pair.key}
                      pair={pair}
                      world={world}
                      isPlayerRivalry={
                        playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId)
                      }
                      index={i}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <HeatLegend />
      </div>
    </AppLayout>
  );
}
