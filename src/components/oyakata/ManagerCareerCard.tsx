import { useMemo } from "react";
import { Trophy, Landmark, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectManagerCareer } from "@/presenters/projections/careerProjections";
import type { WorldState } from "@/presenters/uiDigest";
import type { Id } from "@/engine/types/common";

/** Manager career scorecard — tenure counters, JSA election standing, milestones. */
export function ManagerCareerCard({ world, heyaId }: { world: WorldState; heyaId: Id }) {
  const p = useMemo(() => projectManagerCareer(world, heyaId), [world, heyaId]);
  const hasTenure = p.tenure.bashoServed > 0;
  const risk = Math.max(
    p.successionRisk.insolvency,
    p.successionRisk.scandals,
    p.successionRisk.underperformance
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="h-4 w-4" /> Manager Career
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!hasTenure && (
          <p className="text-muted-foreground italic">Career just begun — no basho served yet.</p>
        )}
        {hasTenure && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="font-bold">{p.tenure.bashoServed}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Basho</div>
            </div>
            <div>
              <div className="font-bold">{p.tenure.championships}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Yusho</div>
            </div>
            <div>
              <div className="font-bold">{p.tenure.sekitoriProduced}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Sekitori</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{p.prestigeBand}</Badge>
          <Badge variant="outline">{p.statureBand}</Badge>
          <Badge variant="outline">{p.legacyTier}</Badge>
          <Badge variant="secondary">
            <Landmark className="mr-1 h-3 w-3" />
            {p.election.chairman ? "Chairman" : p.election.boardSeat ? `Board #${p.election.rank}` : `Rank ${p.election.rank}`}
          </Badge>
        </div>

        {risk >= 0.5 && (
          <div className="flex items-center gap-2 text-destructive text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> Board confidence is wavering.
          </div>
        )}

        <ul className="space-y-1">
          {p.milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-xs">
              <span className={m.achieved ? "text-primary" : "text-muted-foreground"}>
                {m.achieved ? "✓" : `${Math.round(m.progress * 100)}%`}
              </span>
              <span className={m.achieved ? "" : "text-muted-foreground"}>{m.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
