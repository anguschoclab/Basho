import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { RankChangeIndicator } from "./RankChangeIndicator";
import type { OzekiKadobanMap } from "@/engine/banzuke";
import type { UIRosterEntry } from "@/presenters/uiModels";

interface Props {
  entry: UIRosterEntry | null;
  kadobanMap: OzekiKadobanMap;
  heyaName?: string;
  showChanges: boolean;
  searchQuery: string;
  side: "east" | "west";
}

export function RikishiCell({ entry, kadobanMap, heyaName, showChanges, searchQuery, side }: Props) {
  if (!entry) return <td className="p-3 text-muted-foreground/40 text-center">—</td>;

  const q = searchQuery.toLowerCase().trim();
  const isMatch = q && entry.shikona?.toLowerCase().includes(q);

  const isPlayerStable = entry.isPlayerOwned;

  return (
    <td className={`p-3 ${isMatch ? "bg-primary/10" : ""} ${side === "west" ? "text-right" : ""}`}>
      <div className={`flex items-center gap-2 ${side === "west" ? "flex-row-reverse" : ""}`}>
        {isPlayerStable && (
          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" title="Your stable" />
        )}
        <RikishiName
          id={entry.id}
          name={entry.shikona}
          
          className={`font-bold text-sm ${isPlayerStable ? "text-primary" : ""}`}
        />
        <span className="text-[10px] font-mono text-muted-foreground">{entry.record}</span>
        <span className="text-[11px] text-muted-foreground hidden lg:inline">{heyaName}</span>
        {showChanges && entry.rankDelta && (
          <RankChangeIndicator delta={entry.rankDelta} />
        )}
        {entry.rank === "ozeki" && kadobanMap[entry.id]?.isKadoban && (
          <Badge variant="outline" className="text-[9px] border-warning text-warning ml-auto">角番</Badge>
        )}
        {entry.rank === "yokozuna" && (
          <Badge className="text-[9px] rank-yokozuna text-primary-foreground ml-auto">横綱</Badge>
        )}
        {entry.isInjured && (
          <Badge variant="destructive" className="text-[9px] ml-auto">休場</Badge>
        )}
      </div>
    </td>
  );
}
