/**
 * GlobalCupBracket.tsx
 * ====================
 * Visual bracket tree for Global Cup tournament.
 */

import { cn } from "@/lib/utils";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { useGame } from "@/state/game/useGame";
import { resolveAvatar, rikishiStageInput } from "@/presenters/projections/avatarProjections";
import type { GlobalCupMatch } from "@/engine/types/globalCup";

/** Resolves a rikishi avatar chip from world state by id. */
function BracketAvatarChip({ rikishiId, name }: { rikishiId: string; name: string }) {
  const { state } = useGame();
  const rikishi = state.world?.rikishi.get(rikishiId);
  const avatar = rikishi
    ? resolveAvatar({
        id: rikishi.id,
        stored: rikishi.avatarConfig,
        nationality: rikishi.nationality,
        ...rikishiStageInput(rikishi, state.world?.year ?? 0),
      })
    : undefined;
  return <SumoAvatar avatar={avatar} size="xs" fallback={name} />;
}

interface GlobalCupBracketProps {
  matches: GlobalCupMatch[];
  rikishiNames: Map<string, string>;
  className?: string;
}

function MatchCard({
  match,
  rikishiNames,
}: {
  match: GlobalCupMatch;
  rikishiNames: Map<string, string>;
}) {
  const eastName = rikishiNames.get(match.eastRikishiId) || "???";
  const westName = rikishiNames.get(match.westRikishiId) || "???";
  const winnerId = match.winnerRikishiId;

  const isEastWinner = winnerId === match.eastRikishiId;
  const isWestWinner = winnerId === match.westRikishiId;
  const isComplete = !!winnerId;

  return (
    <div className="w-40 bg-card border border-border rounded-lg p-2">
      {/* East side */}
      <div
        className={cn(
          "flex items-center justify-between px-2 py-1 rounded text-xs",
          isComplete && (isEastWinner ? "bg-success/20 font-bold" : "opacity-50")
        )}
      >
        <span className="font-mono text-[10px] text-muted-foreground">E</span>
        <span className="truncate flex items-center gap-1">
          <BracketAvatarChip rikishiId={match.eastRikishiId} name={eastName} />
          {eastName}
        </span>
        {isEastWinner && <span className="text-success">●</span>}
      </div>

      {/* Divider */}
      <div className="border-t border-border/50 my-1" />

      {/* West side */}
      <div
        className={cn(
          "flex items-center justify-between px-2 py-1 rounded text-xs",
          isComplete && (isWestWinner ? "bg-success/20 font-bold" : "opacity-50")
        )}
      >
        <span className="font-mono text-[10px] text-muted-foreground">W</span>
        <span className="truncate flex items-center gap-1">
          <BracketAvatarChip rikishiId={match.westRikishiId} name={westName} />
          {westName}
        </span>
        {isWestWinner && <span className="text-success">●</span>}
      </div>

      {/* Result badge */}
      {isComplete && match.result && (
        <div className="mt-1 text-[10px] text-center text-muted-foreground uppercase">
          {match.result.winningKimarite || "Result"}
        </div>
      )}
    </div>
  );
}

export function GlobalCupBracket({ matches, rikishiNames, className }: GlobalCupBracketProps) {
  // Group matches by round
  const quarterfinals = matches.filter((m) => m.round === "quarterfinal");
  const semifinals = matches.filter((m) => m.round === "semifinal");
  const final = matches.find((m) => m.round === "final");

  return (
    <div className={cn("flex items-center justify-center gap-8 overflow-x-auto p-4", className)}>
      {/* Quarterfinals */}
      <div className="flex flex-col gap-4">
        {quarterfinals.map((match) => (
          <MatchCard key={match.id} match={match} rikishiNames={rikishiNames} />
        ))}
      </div>

      {/* Connector lines */}
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 w-4 border-r border-border flex items-center">
            <div className="w-4 border-b border-border" />
          </div>
        ))}
      </div>

      {/* Semifinals */}
      <div className="flex flex-col gap-16">
        {semifinals.map((match) => (
          <MatchCard key={match.id} match={match} rikishiNames={rikishiNames} />
        ))}
      </div>

      {/* Connector to final */}
      <div className="h-40 w-4 border-r border-border flex items-center">
        <div className="w-4 border-b border-border" />
      </div>

      {/* Final */}
      {final && (
        <div className="relative">
          <div className="absolute -top-8 left-0 right-0 text-center">
            <span className="text-[10px] font-mono font-bold uppercase text-gold tracking-widest">
              FINAL
            </span>
          </div>
          <MatchCard match={final} rikishiNames={rikishiNames} />
        </div>
      )}
    </div>
  );
}
