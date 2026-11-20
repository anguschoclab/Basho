/**
 * RikishiCouncilPanel.tsx
 * =======================
 * §3 Rikishi-kai / Rikishi-ken (力士会, Sekitori Wrestlers' Association) panel
 * on the Governance Politics tab: displays the Kaichō and sekitori delegates,
 * active council charters, pending motions with player voting, and motion proposals.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlossaryTip } from "@/components/ui/GlossaryTip";
import { SectionHeader } from "@/components/layout/page-shell/index";
import { Users, CheckCircle2, Vote } from "lucide-react";
import { useGameStore } from "@/state/stores/gameStore";
import {
  RIKISHI_COUNCIL_MOTION_CATALOG,
  type RikishiCouncilProjection,
  type RikishiCouncilMotionType,
} from "@/presenters/projections/governanceProjections";

export function RikishiCouncilPanel({
  heyaId,
  council,
}: {
  heyaId: string;
  council?: RikishiCouncilProjection;
}) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  if (!council) return null;
  const pendingTypes = new Set(council.pendingMotions.map((m) => m.type));

  const handlePropose = (motionType: RikishiCouncilMotionType) => {
    sendCommand({ type: "PROPOSE_COUNCIL_MOTION", heyaId, motionType });
  };

  const handleVote = (motionId: string, vote: "for" | "against") => {
    sendCommand({ type: "VOTE_COUNCIL_MOTION", motionId, vote });
  };

  return (
    <div className="md:col-span-2 space-y-4" data-testid="rikishi-council-panel">
      <SectionHeader
        eyebrow="SEKITORI ASSEMBLY"
        title="Rikishi-kai (力士会 · Wrestlers' Council)"
      />

      <Card className="border-border/40 bg-card shadow-xs">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>
                Autonomous assembly of active{" "}
                <GlossaryTip termId="rikishi-kai">sekitori</GlossaryTip> deliberating ring safety,
                jungyō welfare, and ceremonial standards.
              </span>
            </div>
            {council.kaicho && (
              <Badge variant="outline" className="text-xs font-mono">
                Kaichō: {council.kaicho.shikona} ({council.kaicho.rank})
              </Badge>
            )}
          </div>

          {/* Delegates */}
          {council.delegates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {council.delegates.map((d) => (
                <span
                  key={d.rikishiId}
                  className={`text-[11px] px-2 py-0.5 rounded border ${
                    d.isPlayerHeya
                      ? "border-primary/40 bg-primary/10 font-semibold"
                      : "border-border/50 bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {d.role === "kaicho" ? "会長 · " : ""}
                  {d.shikona} ({d.division === "makuuchi" ? "Makuuchi" : "Juryo"}
                  {d.heyaName ? ` · ${d.heyaName}` : ""})
                </span>
              ))}
            </div>
          )}

          {/* Active Charters */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active Rikishi-kai Charters
            </div>
            {council.activePolicies.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active council charters yet — motions are deliberated at each post-basho session.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {council.activePolicies.map((pol) => {
                  const meta = RIKISHI_COUNCIL_MOTION_CATALOG.find((c) => c.type === pol);
                  return (
                    <Badge key={pol} variant="secondary" className="gap-1.5 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      {meta?.title ?? pol} ({meta?.effectLabel})
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Motions */}
          <PendingCouncilMotions motions={council.pendingMotions} onVote={handleVote} />

          {/* Propose Motion */}
          <ProposeCouncilMotionGrid
            playerHasSekitori={council.playerHasSekitori}
            pendingTypes={pendingTypes}
            onPropose={handlePropose}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PendingCouncilMotions({
  motions,
  onVote,
}: {
  motions: RikishiCouncilProjection["pendingMotions"];
  onVote: (motionId: string, vote: "for" | "against") => void;
}) {
  if (motions.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Pending Motions for Next Session
      </div>
      {motions.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between gap-3 p-2.5 rounded border border-border/50 bg-muted/20 flex-wrap"
        >
          <div>
            <div className="text-xs font-bold">{m.title}</div>
            <div className="text-[11px] text-muted-foreground">{m.description}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={m.playerVote === "for" ? "default" : "outline"}
              className="h-7 px-2.5 text-[10px]"
              onClick={() => onVote(m.id, "for")}
            >
              <Vote className="h-3 w-3 mr-1" /> Endorse
            </Button>
            <Button
              size="sm"
              variant={m.playerVote === "against" ? "destructive" : "outline"}
              className="h-7 px-2.5 text-[10px]"
              onClick={() => onVote(m.id, "against")}
            >
              Oppose
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProposeCouncilMotionGrid({
  playerHasSekitori,
  pendingTypes,
  onPropose,
}: {
  playerHasSekitori: boolean;
  pendingTypes: ReadonlySet<RikishiCouncilMotionType>;
  onPropose: (motionType: RikishiCouncilMotionType) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Table a Motion ({playerHasSekitori ? "Sekitori eligible" : "Requires active Sekitori"})
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {RIKISHI_COUNCIL_MOTION_CATALOG.map((entry) => {
          const isQueued = pendingTypes.has(entry.type);
          return (
            <div
              key={entry.type}
              className="flex items-center justify-between gap-2 p-2.5 rounded border border-border/40 bg-background/60"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{entry.title}</div>
                <div className="text-[10px] text-muted-foreground">{entry.effectLabel}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[10px] shrink-0"
                disabled={!playerHasSekitori || isQueued}
                onClick={() => onPropose(entry.type)}
              >
                {isQueued ? "Queued" : "Propose"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
