/**
 * RivalriesPageSections.tsx
 *
 * Rivalry list sections of RivalriesPage — player stable rivalries,
 * hot rivalries, institutional feuds, and developing rivalries.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Flame, Swords, Landmark } from "lucide-react";
import type { RivalryPairState } from "@/presenters/engineAccess";
import { toRivalryHeatBand } from "@/presenters/engineAccess";
import { RIVALRY_HEAT_LABELS } from "@/constants/ui/labels";
import { RivalryCard } from "@/components/rivalries/RivalryCard";
import type { RivalriesPageData } from "@/presenters/projections/rivalriesProjections";
import type { WorldState } from "@/presenters/uiDigest";

interface SectionProps {
  world: WorldState;
  playerRivalries: RivalryPairState[];
  hotRivalries: RivalryPairState[];
  coolRivalries: RivalryPairState[];
  stableRivalries: RivalriesPageData["stableRivalries"];
  playerRikishiIds: Set<string>;
}

/** All rivalry list sections, in display order. */
export function RivalrySections({
  world,
  playerRivalries,
  hotRivalries,
  coolRivalries,
  stableRivalries,
  playerRikishiIds,
}: SectionProps) {
  return (
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

      {stableRivalries.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            Institutional Feuds
            <span className="text-xs text-muted-foreground font-normal">
              (Stable vs Stable)
            </span>
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {stableRivalries.map((feud: RivalriesPageData["stableRivalries"][number]) => (
              <Card
                key={`${feud.aId}-${feud.bId}`}
                className="border-border/40 bg-card/20 overflow-hidden"
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase tracking-tighter"
                    >
                      {feud.tone.replace("_", " ")}
                    </Badge>
                    <div className="text-[10px] font-mono text-primary">
                      {RIVALRY_HEAT_LABELS[toRivalryHeatBand(feud.heat)]}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold truncate max-w-[80px]">
                      {feud.aName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">vs</div>
                    <div className="text-xs font-bold truncate max-w-[80px] text-right">
                      {feud.bName}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
  );
}
