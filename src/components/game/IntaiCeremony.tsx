// IntaiCeremony.tsx — Retirement (引退) ceremony modal
// Shows a narrative ceremony when a rikishi retires, with career highlights

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Crown, Award, Star, Scissors, Heart } from "lucide-react";
import type { Rikishi, WorldState } from "@/engine/types";
import { RANK_HIERARCHY } from "@/engine/banzuke";

/** Defines the structure for intai ceremony props. */
interface IntaiCeremonyProps {
  rikishi: Rikishi;
  reason: string;
  world: WorldState;
  open: boolean;
  onClose: () => void;
}

/**
 * Get career narrative.
 *  * @param r - The R.
 *  * @param reason - The Reason.
 *  * @returns The result.
 */
function getCareerNarrative(r: Rikishi, reason: string): string[] {
  const lines: string[] = [];
  const rankInfo = RANK_HIERARCHY[r.rank];
  const rankJa = rankInfo?.nameJa ?? r.rank;

  lines.push(
    `After a career that reached the rank of ${rankJa}, ${r.shikona} has announced their retirement from professional sumo.`
  );

  if (reason) {
    lines.push(`Reason: ${reason}.`);
  }

  const totalBouts = (r.careerWins || 0) + (r.careerLosses || 0);
  if (totalBouts > 0) {
    lines.push(
      `Career record: ${r.careerWins || 0} wins, ${r.careerLosses || 0} losses across an estimated ${Math.ceil(totalBouts / 15)} tournaments.`
    );
  }

  if (r.careerRecord?.yusho && r.careerRecord.yusho > 0) {
    lines.push(`Championship titles: ${r.careerRecord.yusho} yūshō — a remarkable achievement.`);
  }

  if (r.economics?.kinboshiCount && r.economics.kinboshiCount > 0) {
    lines.push(`Earned ${r.economics.kinboshiCount} kinboshi (gold star) victories over yokozuna.`);
  }

  lines.push(
    `The danpatsu-shiki (断髪式) ceremony marks the final cutting of the topknot — a solemn farewell to the dohyō.`
  );

  return lines;
}

/**
 * intai ceremony.
 *  * @param { rikishi, reason, world, open, onClose } - The { rikishi, reason, world, open, on close }.
 */
export function IntaiCeremony({ rikishi, reason, world, open, onClose }: IntaiCeremonyProps) {
  const heya = world.heyas.get(rikishi.heyaId);
  const isPlayerRikishi = rikishi.heyaId === world.playerHeyaId;
  const narrative = useMemo(() => getCareerNarrative(rikishi, reason), [rikishi, reason]);
  const rankInfo = RANK_HIERARCHY[rikishi.rank];
  const isSekitori = rankInfo?.isSekitori ?? false;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scissors className="h-5 w-5 text-muted-foreground" />
            引退 — Intai Ceremony
          </DialogTitle>
          <DialogDescription>
            {rikishi.shikona} bids farewell to the dohyō
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rikishi header */}
          <div className={`p-4 rounded-lg border ${isPlayerRikishi ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Crown className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-display font-bold">{rikishi.shikona}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="capitalize">{rankInfo?.nameJa ?? rikishi.rank}</Badge>
                  <span>{heya?.name ?? "Unknown Stable"}</span>
                  {isPlayerRikishi && <Badge className="bg-primary/20 text-primary text-xs">Your Rikishi</Badge>}
                </div>
              </div>
            </div>
          </div>

          {/* Career highlights */}
          {isSekitori && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded bg-muted/50">
                <div className="text-lg font-bold font-mono">{rikishi.careerWins || 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Career Wins</div>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <div className="text-lg font-bold font-mono">{rikishi.careerRecord?.yusho || 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Yūshō</div>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <div className="text-lg font-bold font-mono">{rikishi.economics?.kinboshiCount || 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Kinboshi</div>
              </div>
            </div>
          )}

          <Separator />

          {/* Narrative */}
          <div className="space-y-2">
            {narrative.map((line, i) => (
              <p key={i} className={`text-sm ${i === narrative.length - 1 ? "text-muted-foreground italic" : "text-foreground"}`}>
                {line}
              </p>
            ))}
          </div>

          {/* Farewell */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 text-sm">
            <Heart className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              {isPlayerRikishi
                ? `${rikishi.shikona} leaves your stable. Their legacy will be remembered.`
                : `The sumo world wishes ${rikishi.shikona} well in their next chapter.`}
            </span>
          </div>

          <Button onClick={onClose} className="w-full">
            Acknowledge Retirement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
