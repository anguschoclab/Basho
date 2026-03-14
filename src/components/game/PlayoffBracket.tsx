import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Swords, ChevronRight } from "lucide-react";
import { ClickableName } from "@/components/ClickableName";
import type { MatchSchedule } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

/** Defines the structure for playoff bracket props. */
interface PlayoffBracketProps {
  matches: MatchSchedule[];
  world: WorldState;
}

/**
 * playoff bracket.
 *  * @param { matches, world } - The { matches, world }.
 */
export function PlayoffBracket({ matches, world }: PlayoffBracketProps) {
  if (!matches || matches.length === 0) return null;

  // Group by round (day 16 = round 1, day 17 = round 2, etc.)
  const rounds = new Map<number, MatchSchedule[]>();
  for (const m of matches) {
    const round = m.day - 15; // day 16 = round 1
    if (!rounds.has(round)) rounds.set(round, []);
    rounds.get(round)!.push(m);
  }

  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  const isFinal = sortedRounds.length > 0;
  const finalMatch = matches[matches.length - 1];
  const champion = finalMatch?.result ? world.rikishi.get(finalMatch.result.winnerRikishiId) : null;

  return (
    <Card className="border-gold/30 bg-gradient-to-b from-gold/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-gold" />
          Yūshō Playoff
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {matches.length === 1
            ? "Two rikishi tied — decided by kettei-sen"
            : `${matches.length} playoff bouts across ${sortedRounds.length} round${sortedRounds.length > 1 ? "s" : ""}`}
        </p>
      </CardHeader>
      <CardContent>
        {/* Champion announcement */}
        {champion && (
          <div className="mb-4 p-3 rounded-lg border border-gold/30 bg-gold/10 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Champion via Playoff</p>
            <p className="text-xl font-display font-bold">{champion.shikona}</p>
            {finalMatch?.result && (
              <p className="text-xs text-muted-foreground mt-1">
                Won by {finalMatch.result.kimariteName || finalMatch.result.kimarite}
              </p>
            )}
          </div>
        )}

        {/* Bracket rounds */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {sortedRounds.map(([round, roundMatches]) => (
            <div key={round} className="shrink-0 min-w-[200px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {sortedRounds.length === 1 ? "Kettei-sen" : `Round ${round}`}
              </p>
              <div className="space-y-2">
                {roundMatches.map((m, i) => {
                  const east = world.rikishi.get(m.eastRikishiId);
                  const west = world.rikishi.get(m.westRikishiId);
                  const result = m.result;
                  const eastWon = result?.winnerRikishiId === m.eastRikishiId;
                  const westWon = result?.winnerRikishiId === m.westRikishiId;

                  return (
                    <div key={i} className="border rounded-md overflow-hidden bg-card">
                      {/* East */}
                      <div
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs border-b ${
                          eastWon ? "bg-success/10 font-bold" : ""
                        }`}
                      >
                        <div className="w-1 h-4 rounded-full bg-east" />
                        <RikishiName
                          id={m.eastRikishiId}
                          name={east?.shikona || "???"}

                          className={eastWon ? "font-bold" : ""}
                        />
                        {eastWon && <Trophy className="h-3 w-3 text-gold ml-auto" />}
                      </div>
                      {/* West */}
                      <div
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs ${
                          westWon ? "bg-success/10 font-bold" : ""
                        }`}
                      >
                        <div className="w-1 h-4 rounded-full bg-west" />
                        <RikishiName
                          id={m.westRikishiId}
                          name={west?.shikona || "???"}

                          className={westWon ? "font-bold" : ""}
                        />
                        {westWon && <Trophy className="h-3 w-3 text-gold ml-auto" />}
                      </div>
                      {/* Kimarite */}
                      {result && (
                        <div className="px-2 py-1 bg-muted/50 text-[10px] text-muted-foreground text-center">
                          {result.kimariteName || result.kimarite}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
