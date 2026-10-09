/**
 * CompareModePanelSections.tsx
 *
 * Sections of CompareModePanel — rikishi header cards, stat comparison
 * table, and the trial-clash action/result block.
 */

import type { UIRikishi } from "@/presenters/uiModels";
import type { WorldState } from "@/presenters/uiDigest";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sword, RotateCcw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { cn } from "@/lib/utils";

/** One side of the versus header — avatar, shikona, rank badge. */
export function CompareRikishiHeader({
  rikishi,
  highlight,
}: {
  rikishi: UIRikishi;
  highlight: boolean;
}) {
  return (
    <div
      className={cn(
        "text-center space-y-2 p-4 rounded-xl border",
        highlight ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-primary/10"
      )}
    >
      <SumoAvatar
        config={rikishi.avatarConfig}
        size="lg"
        className="mx-auto"
        expression="neutral"
      />
      <h3
        className={cn("font-display font-bold text-lg", highlight && "text-primary")}
      >
        {rikishi.shikona}
      </h3>
      <Badge
        variant="outline"
        className={highlight ? "bg-primary/10 text-primary border-primary/30" : "bg-primary/5"}
      >
        {rikishi.rankLabel}
      </Badge>
    </div>
  );
}

/** One stat row — valA, label+diff indicator, valB. */
function CompareStatRow({ label, valA, valB }: { label: string; valA: number; valB: number }) {
  const diff = valA - valB;
  return (
    <div className="group flex items-center justify-between py-2 border-b border-primary/5 last:border-0">
      <div className="w-16 text-right font-display font-bold text-lg">{valA}</div>

      <div className="flex flex-col items-center gap-1 flex-1 px-4">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-center w-full">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {diff > 0 ? (
            <TrendingUp className="h-3 w-3 text-success" />
          ) : diff < 0 ? (
            <TrendingDown className="h-3 w-3 text-destructive" />
          ) : (
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
          <span
            className={cn(
              "text-[10px] font-mono font-bold",
              diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {diff > 0 ? `+${diff}` : diff === 0 ? "even" : diff}
          </span>
        </div>
      </div>

      <div className="w-16 text-left font-display font-bold text-lg text-primary">{valB}</div>
    </div>
  );
}

/** Comparison stats card — eight stat rows from the raw rikishi records. */
export function CompareStats({
  world,
  rikishiA,
  rikishiB,
}: {
  world: WorldState | null;
  rikishiA: UIRikishi;
  rikishiB: UIRikishi;
}) {
  const rawA = world?.rikishi.get(rikishiA.id);
  const rawB = world?.rikishi.get(rikishiB.id);

  return (
    <Card className="bg-background shadow-xl overflow-hidden border-primary/10">
      <CardContent className="p-6">
        {!rawA || !rawB ? (
          <p className="text-center text-muted-foreground">Stats unavailable</p>
        ) : (
          <div className="space-y-2">
            <CompareStatRow label="Strength" valA={rawA.stats.power} valB={rawB.stats.power} />
            <CompareStatRow label="Speed" valA={rawA.stats.speed} valB={rawB.stats.speed} />
            <CompareStatRow label="Balance" valA={rawA.stats.balance} valB={rawB.stats.balance} />
            <CompareStatRow
              label="Technique"
              valA={rawA.stats.technique}
              valB={rawB.stats.technique}
            />
            <CompareStatRow label="Stamina" valA={rawA.stats.stamina} valB={rawB.stats.stamina} />
            <CompareStatRow label="Spirit" valA={rawA.stats.mental} valB={rawB.stats.mental} />
            <CompareStatRow label="Weight" valA={rawA.weight} valB={rawB.weight} />
            <CompareStatRow label="Height" valA={rawA.height} valB={rawB.height} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Trial-clash action area — run button, simulating spinner, verdict card. */
export function TrialClashSection({
  rikishiA,
  rikishiB,
  isSimulating,
  results,
  onRun,
  onReset,
}: {
  rikishiA: UIRikishi;
  rikishiB: UIRikishi;
  isSimulating: boolean;
  results: { winner: "A" | "B"; score: string } | null;
  onRun: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {!results && !isSimulating && (
        <Button
          size="lg"
          className="group h-14 px-12 gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-display text-xl rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          onClick={onRun}
        >
          <Sword className="h-6 w-6 group-hover:rotate-12 transition-transform" />
          Run Trial Clash
        </Button>
      )}

      {isSimulating && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="h-14 flex items-center gap-3 text-lg font-display animate-pulse">
            <Sword className="h-6 w-6 animate-spin" />
            Simulating Clash...
          </div>
        </div>
      )}

      {results && (
        <div className="w-full flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-8">
            <div
              className={cn(
                "p-4 rounded-2xl border-2 flex flex-col items-center gap-1",
                results.winner === "A"
                  ? "border-success/50 bg-success/10"
                  : "border-muted opacity-50"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">Score</span>
              <span className="text-3xl font-display font-black">
                {results.score.split(" - ")[0]}
              </span>
            </div>

            <div className="flex flex-col items-center text-center max-w-[200px]">
              <Badge className="bg-success text-success-foreground hover:bg-success/90 mb-2">
                TRIAL VERDICT
              </Badge>
              <h4 className="font-display font-bold text-xl uppercase tracking-tight">
                {results.winner === "A" ? rikishiA.shikona : rikishiB.shikona} Wins
              </h4>
            </div>

            <div
              className={cn(
                "p-4 rounded-2xl border-2 flex flex-col items-center gap-1",
                results.winner === "B"
                  ? "border-primary/50 bg-primary/10"
                  : "border-muted opacity-50"
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">Score</span>
              <span className="text-3xl font-display font-black text-primary">
                {results.score.split(" - ")[1]}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onReset}
            className="gap-2 rounded-full h-12 px-8 border-primary/20"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Comparison
          </Button>
        </div>
      )}
    </div>
  );
}
