/**
 * ExhibitionBoutSections.tsx
 *
 * Render sections of ExhibitionBout — header/matchup, PbP log,
 * result banner, "what's next" card, and controls row.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/presenters/uiDigest";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Swords, Trophy } from "lucide-react";
import { PbpLineText } from "@/components/game/PbpLineText";
import { KimariteTag } from "@/components/ui/KimariteTag";
import { selectKimariteObservedShare } from "@/presenters/selectors";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** Title block + east/west matchup display. */
export function ExhibitionHeader({ east, west }: { east: Rikishi; west: Rikishi }) {
  return (
    <>
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          Exhibition Bout — Preseason Demonstration
        </p>
        <h2 className="text-3xl font-display font-black uppercase tracking-tight">
          Live Bout Preview
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 text-center">
          <div className="text-lg font-display font-black uppercase">
            {east.shikona ?? east.name}
          </div>
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider mt-1">
            {east.rank}
          </Badge>
        </div>
        <div className="shrink-0">
          <Swords className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 text-center">
          <div className="text-lg font-display font-black uppercase">
            {west.shikona ?? west.name}
          </div>
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider mt-1">
            {west.rank}
          </Badge>
        </div>
      </div>
    </>
  );
}

/** Scrollable PbP log, revealing lines progressively. */
export function ExhibitionPbpLog({
  logLines,
  revealedCount,
}: {
  logLines: NonNullable<BoutResult["pbpLines"]>;
  revealedCount: number;
}) {
  return (
    <ScrollArea className="bg-muted/30 rounded-lg border border-border/40 min-h-[220px] max-h-[280px]">
      <div className="p-4 pr-6 space-y-2">
        {logLines.slice(0, revealedCount).map((line, i) => (
          <div
            key={i}
            className={cn(
              "text-sm leading-relaxed animate-in fade-in slide-in-from-left-3 duration-400",
              i === revealedCount - 1 ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            <PbpLineText text={typeof line === "string" ? line : line.text} />
          </div>
        ))}
        {revealedCount === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Press "Next" to watch the bout unfold...
          </p>
        )}
      </div>
    </ScrollArea>
  );
}

/** Winner banner once the bout is fully revealed. */
export function ExhibitionResultBanner({
  world,
  boutResult,
  winnerRikishi,
  loserRikishi,
}: {
  world: WorldState;
  boutResult: BoutResult;
  winnerRikishi: Rikishi;
  loserRikishi: Rikishi;
}) {
  return (
    <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg p-4 animate-in fade-in duration-500">
      <Trophy className="h-6 w-6 text-primary shrink-0" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Result</p>
        <p className="font-display font-black text-lg uppercase">
          {winnerRikishi.shikona ?? winnerRikishi.name} wins by{" "}
          <KimariteTag
            kimariteId={boutResult.kimarite}
            kimariteName={boutResult.kimariteName}
            observedPct={selectKimariteObservedShare(world, boutResult.kimarite)}
          />
        </p>
        <p className="text-xs text-muted-foreground">
          {loserRikishi.shikona ?? loserRikishi.name} defeated
        </p>
      </div>
    </div>
  );
}

/** "Your Role as Oyakata" explainer card. */
export function ExhibitionWhatsNext() {
  return (
    <div className="glass rounded-lg p-6 border border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h3 className="font-display font-black text-lg uppercase tracking-tight mb-3">
        Your Role as Oyakata
      </h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>Manage training regimens and sparring partnerships</span>
        </li>
        <li className="flex items-start gap-2">
          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>Navigate basho (tournament) schedules across 6 Grand Tournaments</span>
        </li>
        <li className="flex items-start gap-2">
          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>Balance finances, sponsors, and facilities</span>
        </li>
        <li className="flex items-start gap-2">
          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>Participate in JSA governance and ichimon politics</span>
        </li>
        <li className="flex items-start gap-2">
          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>Scout recruits and develop the next generation</span>
        </li>
      </ul>
    </div>
  );
}

/** Progress counter + Next/Begin button. */
export function ExhibitionControls({
  revealedCount,
  totalLines,
  isFullyRevealed,
  onNext,
  onFinish,
}: {
  revealedCount: number;
  totalLines: number;
  isFullyRevealed: boolean;
  onNext: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
        {revealedCount}/{totalLines} actions
      </p>
      {!isFullyRevealed ? (
        <Button
          onClick={onNext}
          className="gap-2 font-display font-black uppercase tracking-wide"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={onFinish}
          className="gap-2 font-display font-black uppercase tracking-wide bg-primary"
        >
          Begin My Career
        </Button>
      )}
    </div>
  );
}
