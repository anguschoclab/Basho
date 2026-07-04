import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { BoutResultDisplay } from "./BoutResultDisplay";
import { BoutNarrativeModal } from "./BoutNarrativeModal";
import type { UIRikishi } from "@/presenters/uiModels";
import type { KeyBoutMoment } from "@/presenters/projections/recapProjections";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<string, string> = {
  yusho_decider: "border-gold text-gold bg-gold/10",
  biggest_upset: "border-destructive text-destructive bg-destructive/10",
  kinboshi: "border-amber-500 text-amber-500 bg-amber-500/10",
};

interface KeyBoutsSectionProps {
  moments: KeyBoutMoment[];
  getRikishi: (id: string) => UIRikishi | null;
}

export function KeyBoutsSection({ moments, getRikishi }: KeyBoutsSectionProps) {
  const [replayMoment, setReplayMoment] = useState<KeyBoutMoment | null>(null);

  if (moments.length === 0) return null;

  const cards: { moment: KeyBoutMoment; east: UIRikishi; west: UIRikishi }[] = [];
  for (const moment of moments) {
    const east = getRikishi(moment.eastRikishiId);
    const west = getRikishi(moment.westRikishiId);
    if (!east || !west) continue;
    cards.push({ moment, east, west });
  }

  if (cards.length === 0) return null;

  const replayCard = replayMoment
    ? cards.find((c) => c.moment.bout.boutId === replayMoment.bout.boutId)
    : null;

  return (
    <div className="pt-12">
      <div className="flex items-center gap-4 mb-10">
        <h2 className="text-3xl font-display font-black uppercase tracking-tighter">
          Bouts of the Basho
        </h2>
        <div className="h-px flex-1 bg-border/20" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map(({ moment, east, west }) => (
          <div
            key={moment.bout.boutId}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={cn("text-[10px] uppercase tracking-wider", BADGE_STYLES[moment.label])}
              >
                {moment.labelText}
              </Badge>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Day {moment.day}
              </span>
            </div>

            <BoutResultDisplay
              result={moment.bout}
              eastRikishi={east}
              westRikishi={west}
              compact
            />

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setReplayMoment(moment)}
            >
              <Play className="h-3.5 w-3.5" /> Watch Replay
            </Button>
          </div>
        ))}
      </div>

      {replayCard && (
        <BoutNarrativeModal
          open={true}
          onClose={() => setReplayMoment(null)}
          east={replayCard.east}
          west={replayCard.west}
          result={replayCard.moment.bout}
          bashoName={replayCard.moment.bashoName}
          day={replayCard.moment.day}
          autoPlay={false}
        />
      )}
    </div>
  );
}
