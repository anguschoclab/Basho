import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, ChevronsUp, ChevronsDown, ArrowUpRight } from "lucide-react";

/** Defines the structure for props. */
interface Props {
  rikishiId: string;
  currentRank: string;
  currentRankNumber?: number;
  currentSide?: string;
  prevRankMap: Map<string, { rank: string; rankNumber?: number; side?: string; score: number }>;
}

const RANK_TIER: Record<string, number> = {
  yokozuna: 1, ozeki: 2, sekiwake: 3, komusubi: 4,
  maegashira: 5, juryo: 6, makushita: 7,
  sandanme: 8, jonidan: 9, jonokuchi: 10,
};

/**
 * Rank score.
 *  * @param rank - The Rank.
 *  * @param rankNumber - The Rank number.
 *  * @param side - The Side.
 *  * @returns The result.
 */
export function rankScore(rank: string, rankNumber?: number, side?: string): number {
  const tier = RANK_TIER[rank] ?? 99;
  const num = rankNumber ?? 0;
  const sideVal = side === "east" ? 0 : 0.5;
  return tier * 1000 + num * 2 + sideVal;
}

/**
 * rank change indicator.
 *  * @param { rikishiId, currentRank, currentRankNumber, currentSide, prevRankMap } - The { rikishi id, current rank, current rank number, current side, prev rank map }.
 */
export function RankChangeIndicator({ rikishiId, currentRank, currentRankNumber, currentSide, prevRankMap }: Props) {
  const prev = prevRankMap.get(rikishiId);
  if (!prev) {
    return (
      <Badge variant="outline" className="text-[8px] h-4 px-1 border-primary/40 text-primary gap-0.5">
        <ArrowUpRight className="h-2.5 w-2.5" /> NEW
      </Badge>
    );
  }

  const currScore = rankScore(currentRank, currentRankNumber, currentSide);
  const diff = prev.score - currScore;

  if (Math.abs(diff) < 1) {
    return <Minus className="h-3 w-3 text-muted-foreground/40" />;
  }

  const steps = Math.round(Math.abs(diff) / 2);

  if (diff > 0) {
    const Icon = steps >= 5 ? ChevronsUp : ArrowUp;
    return (
      <span className="flex items-center gap-0.5 text-success">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] font-mono font-bold">+{steps}</span>
      </span>
    );
  } else {
    const Icon = steps >= 5 ? ChevronsDown : ArrowDown;
    return (
      <span className="flex items-center gap-0.5 text-destructive">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] font-mono font-bold">−{steps}</span>
      </span>
    );
  }
}
