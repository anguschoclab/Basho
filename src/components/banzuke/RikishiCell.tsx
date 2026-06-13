import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { RankChangeIndicator } from "./RankChangeIndicator";
import type { UIRosterEntry } from "@/presenters/uiModels";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { KeshoMiniIndicator } from "@/components/kesho/KeshoMiniIndicator";

interface Props {
  entry: UIRosterEntry | null;
  kadobanMap: Record<string, { isKadoban: boolean }>;
  heyaName?: string;
  showChanges: boolean;
  searchQuery: string;
  side: "east" | "west";
}

export const RikishiCell = memo(function RikishiCell({
  entry,
  kadobanMap,
  heyaName,
  showChanges,
  searchQuery,
  side,
}: Props) {
  if (!entry) return <td className="p-3 text-muted-foreground/40 text-center">—</td>;

  const q = searchQuery.toLowerCase().trim();
  const isMatch = q && entry.shikona?.toLowerCase().includes(q);

  const isPlayerStable = entry.isPlayerOwned;

  return (
    <td className={`p-3 ${isMatch ? "bg-primary/10" : ""} ${side === "west" ? "text-right" : ""}`}>
      <div className={`flex items-center gap-2 ${side === "west" ? "flex-row-reverse" : ""}`}>
        {isPlayerStable && (
          <TooltipWrap content="Rikishi from your stable" side="top">
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow cursor-help" />
          </TooltipWrap>
        )}
        <SumoAvatar
          config={entry.avatarConfig}
          size="xs"
          showHairstyle={entry.division === "makuuchi" || entry.division === "juryo"}
          fallback={entry.shikona}
        />
        {/* Kesho indicator for sekitori */}
        {entry.keshoMawashi && (
          <TooltipWrap content={`Kesho-mawashi (${entry.keshoMawashi.tier})`} side="top">
            <KeshoMiniIndicator kesho={entry.keshoMawashi} />
          </TooltipWrap>
        )}
        <RikishiName
          id={entry.id}
          name={entry.shikona}
          className={`font-bold text-sm ${isPlayerStable ? "text-primary" : ""}`}
        />
        <span className="text-[10px] font-mono text-muted-foreground">{entry.record}</span>
        <span className="text-[11px] text-muted-foreground hidden lg:inline">{heyaName}</span>
        {showChanges && entry.rankDelta && <RankChangeIndicator delta={entry.rankDelta} />}
        {entry.rank === "ozeki" && entry.consecutiveStrongOzeki >= 1 && (
          <TooltipWrap
            content="Promotion Watch: Strong candidate for Yokozuna promotion"
            side="top"
          >
            <span
              className="text-[14px] ml-auto cursor-help"
              role="img"
              aria-label="Promotion Watch"
            >
              🏆
            </span>
          </TooltipWrap>
        )}
        {entry.rank === "ozeki" && kadobanMap[entry.id]?.isKadoban && (
          <TooltipWrap
            content="Kadoban: Must achieve a winning record to maintain Ozeki rank"
            side="top"
          >
            <Badge variant="destructive" className="text-[9px] ml-auto cursor-help">
              角番
            </Badge>
          </TooltipWrap>
        )}
        {entry.rank === "yokozuna" && (
          <TooltipWrap content="Yokozuna: The grand champion rank" side="top">
            <Badge className="text-[9px] rank-yokozuna text-primary-foreground ml-auto cursor-help">
              横綱
            </Badge>
          </TooltipWrap>
        )}
        {entry.isInjured && (
          <TooltipWrap
            content="Kyujo: Withdrawn from the current tournament due to injury"
            side="top"
          >
            <Badge variant="destructive" className="text-[9px] ml-auto cursor-help">
              休場
            </Badge>
          </TooltipWrap>
        )}
      </div>
    </td>
  );
});
