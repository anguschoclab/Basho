/**
 * GlobalCupParticipant.tsx
 * ========================
 * Participant card with nationality flag for Global Cup.
 */

import { cn } from "@/lib/utils";
import type { GlobalCupParticipant } from "@/engine/types/globalCup";

interface GlobalCupParticipantProps {
  participant: GlobalCupParticipant;
  isChampion?: boolean;
  className?: string;
}

// Simple flag mapping (using emoji for now)
const flagMap: Record<string, string> = {
  Japan: "🇯🇵",
  Mongolia: "🇲🇳",
  Estonia: "🇪🇪",
  Georgia: "🇬🇪",
  Bulgaria: "🇧🇬",
  Brazil: "🇧🇷",
  USA: "🇺🇸",
  Russia: "🇷🇺",
  Ukraine: "🇺🇦",
  China: "🇨🇳",
  Korea: "🇰🇷",
  Hungary: "🇭🇺",
  Czech: "🇨🇿",
};

export function GlobalCupParticipantCard({
  participant,
  isChampion,
  className,
}: GlobalCupParticipantProps) {
  const flag = flagMap[participant.nationality] || "🏳️";

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        isChampion ? "border-gold bg-gold/10" : "border-border bg-card hover:border-primary/20",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{flag}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
              #{participant.seed}
            </span>
            <span className="font-bold truncate">{participant.shikona}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {participant.rank}
            {participant.isChallenger && (
              <span className="ml-2 text-[10px] uppercase text-gold">Challenger</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
