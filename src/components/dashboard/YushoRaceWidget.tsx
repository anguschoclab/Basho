/**
 * Yusho Race Widget
 * Shows top rikishi competing for the tournament championship
 * Features large avatars with rank-colored borders and medal indicators
 */

import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Trophy, Medal, Award } from "lucide-react";
import type { UIRosterEntry } from "@/presenters/rikishiUI";

interface YushoContenderProps {
  entry: UIRosterEntry;
  rank: number;
}

const YushoContender: React.FC<YushoContenderProps> = ({ entry, rank }) => {
  const navigate = useNavigate();

  const medals = [
    { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-100", label: "1st" },
    { icon: Medal, color: "text-gray-400", bg: "bg-gray-100", label: "2nd" },
    { icon: Award, color: "text-amber-600", bg: "bg-amber-100", label: "3rd" },
  ];

  const medal = medals[rank - 1] || null;
  const MedalIcon = medal?.icon;

  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => navigate({ to: "/rikishi", params: { id: entry.id } })}
    >
      {/* Avatar with medal */}
      <div className="relative">
        <SumoAvatar
          config={entry.avatarConfig}
          size="lg"
          showHairstyle={true}
          rankTier={entry.division === "makuuchi" ? entry.rank : undefined}
          showGlow={rank === 1}
          expression={rank === 1 ? "confident" : rank <= 3 ? "determined" : "neutral"}
          fallback={entry.shikona}
          className={rank === 1 ? "ring-2 ring-yellow-400 ring-offset-2" : ""}
        />
        {medal && MedalIcon && (
          <div
            className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${medal.bg} border-2 border-background flex items-center justify-center shadow-sm`}
          >
            <MedalIcon className={`w-4 h-4 ${medal.color}`} />
          </div>
        )}
      </div>

      {/* Rank and record */}
      <div className="text-center">
        <Badge
          variant="outline"
          className={`text-[10px] font-display ${
            rank === 1
              ? "border-yellow-400 text-yellow-700"
              : rank === 2
                ? "border-gray-400 text-gray-700"
                : rank === 3
                  ? "border-amber-600 text-amber-700"
                  : ""
          }`}
        >
          {entry.rankLabel}
        </Badge>
        <p className="text-xs font-mono mt-1 text-muted-foreground">{entry.record}</p>
      </div>

      {/* Shikona */}
      <p className="text-sm font-bold text-center truncate w-20">{entry.shikona}</p>
    </div>
  );
};

export const YushoRaceWidget: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { state } = useGame();
  const navigate = useNavigate();

  const topContenders = useMemo(() => {
    // Get top rikishi sorted by wins from tournament
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] = [];

    // TODO: Connect to actual tournament state
    // This is a placeholder implementation

    return entries.slice(0, 5);
  }, []);

  if (topContenders.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Yūshō Race
          </CardTitle>
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80"
            onClick={() => navigate({ to: "/banzuke" })}
          >
            View Full Banzuke
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around items-start">
          {topContenders.map((entry, index) => (
            <YushoContender key={entry.id} entry={entry} rank={index + 1} />
          ))}
        </div>

        {/* Race summary */}
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Top {topContenders.length} contenders based on current tournament record
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default YushoRaceWidget;
