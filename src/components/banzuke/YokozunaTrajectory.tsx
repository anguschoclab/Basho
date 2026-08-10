import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { YokozunaCandidate } from "@/presenters/projections/promotionProjections";

interface YokozunaTrajectoryProps {
  candidates: YokozunaCandidate[];
}

/** Returns a filled/half/empty state for each of 6 basho track boxes. */
function buildTrack(
  consecutiveYushos: number,
  recentYushos: number,
  recentJunYushos: number
): Array<"yusho" | "jun-yusho" | "empty"> {
  // Fill from right: last 2 slots are the "recent" window.
  // Consecutive yushos fill from right within the full 6-box window.
  const track: Array<"yusho" | "jun-yusho" | "empty"> = Array(6).fill("empty");

  // Place recent results in the rightmost 2 slots.
  // slot 5 = most recent, slot 4 = second most recent.
  let placed = 0;
  for (let i = 5; i >= 4 && placed < recentYushos + recentJunYushos; i--) {
    if (placed < recentYushos) {
      track[i] = "yusho";
    } else {
      track[i] = "jun-yusho";
    }
    placed++;
  }

  // If there are consecutive yushos beyond the 2-basho window, fill earlier slots.
  if (consecutiveYushos > recentYushos) {
    let extra = consecutiveYushos - recentYushos;
    for (let i = 3; i >= 0 && extra > 0; i--) {
      if (track[i] === "empty") {
        track[i] = "yusho";
        extra--;
      }
    }
  }

  return track;
}

function TrackBox({ state }: { state: "yusho" | "jun-yusho" | "empty" }) {
  if (state === "yusho") {
    return (
      <div
        className="h-5 w-5 rounded-xs bg-gold border border-gold/60 flex items-center justify-center"
        title="Yusho (Tournament Win)"
        aria-label="Yusho"
      >
        <span className="text-[8px] font-mono font-bold text-background leading-none">Y</span>
      </div>
    );
  }
  if (state === "jun-yusho") {
    return (
      <div
        className="h-5 w-5 rounded-xs border border-gold/60 flex items-center justify-center overflow-hidden"
        title="Jun-Yusho (Runner-up)"
        aria-label="Jun-Yusho"
        style={{ background: "linear-gradient(to top, rgb(var(--gold)) 50%, transparent 50%)" }}
      >
        <span className="sr-only">Jun-Yusho</span>
      </div>
    );
  }
  return (
    <div
      className="h-5 w-5 rounded-xs border border-border/40 bg-muted/30"
      title="No notable result"
      aria-label="Empty"
    />
  );
}

function SupportVerdict({ supportLevel }: { supportLevel: YokozunaCandidate["supportLevel"] }) {
  if (supportLevel === "strong") {
    return <span className="text-xs font-semibold text-success font-display">Strong case</span>;
  }
  if (supportLevel === "adequate") {
    return (
      <span className="text-xs font-semibold text-yellow-400 font-display">
        Under consideration
      </span>
    );
  }
  return <span className="text-xs font-semibold text-destructive font-display">Insufficient</span>;
}

function CandidateCard({ candidate }: { candidate: YokozunaCandidate }) {
  const {
    rikishi,
    recentYushos,
    recentJunYushos,
    consecutiveYushos,
    politicalPressure,
    supportLevel,
    narrative,
  } = candidate;

  const track = buildTrack(consecutiveYushos, recentYushos, recentJunYushos);
  const championshipFormPct = Math.min(100, (recentYushos / 2) * 100);
  const truncatedNarrative = narrative.length > 120 ? narrative.slice(0, 117) + "…" : narrative;

  return (
    <Card className="border-gold/20 bg-card/80">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-base tracking-tight">{rikishi.shikona}</span>
          <Badge variant="gold">{rikishi.rankLabel}</Badge>
          {rikishi.isPlayerOwned && (
            <Badge variant="outline" className="border-primary/40 text-primary text-[9px]">
              Your Stable
            </Badge>
          )}
          <div className="ml-auto">
            <SupportVerdict supportLevel={supportLevel} />
          </div>
        </div>

        {/* Yusho track */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
            Recent Tournament Record
          </p>
          <div className="flex items-center gap-1.5">
            {track.map((state, i) => (
              <TrackBox key={i} state={state} />
            ))}
            <span className="ml-2 text-[10px] font-mono text-muted-foreground">
              {recentYushos}Y · {recentJunYushos}JY (last 2)
            </span>
          </div>
        </div>

        {/* Criteria progress bars */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Championship Form
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {recentYushos}/2 yusho
              </span>
            </div>
            <Progress value={championshipFormPct} indicatorClassName="bg-gold" className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Association Support
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {politicalPressure}/100
              </span>
            </div>
            <Progress
              value={politicalPressure}
              indicatorClassName={
                politicalPressure >= 75
                  ? "bg-success"
                  : politicalPressure >= 50
                    ? "bg-yellow-400"
                    : "bg-destructive"
              }
              className="h-1.5"
            />
          </div>
        </div>

        {/* Narrative quote */}
        <p className="text-[11px] italic text-muted-foreground leading-relaxed font-body">
          "{truncatedNarrative}"
        </p>
      </CardContent>
    </Card>
  );
}

export function YokozunaTrajectory({ candidates }: YokozunaTrajectoryProps) {
  if (candidates.length === 0) {
    return (
      <div className="text-sm text-muted-foreground font-display text-center py-4">
        No Ozeki currently on a promotion run.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {candidates.map((c) => (
        <CandidateCard key={c.rikishi.id} candidate={c} />
      ))}
    </div>
  );
}
