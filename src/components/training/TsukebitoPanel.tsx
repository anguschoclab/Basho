/**
 * TsukebitoPanel — player control for tsukebito (personal attendant) assignments.
 *
 * Lets the player assign junior rikishi as tsukebito to senior sekitori,
 * and clear existing assignments. Surfaces the real tsukebitoIds on Rikishi.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, X } from "lucide-react";
import type { TsukebitoProjection } from "@/presenters/tsukebitoProjections";

export function TsukebitoPanel({
  projection,
  onSet,
  onClear,
}: {
  projection: TsukebitoProjection;
  onSet: (seniorId: string, juniorId: string) => void;
  onClear: (seniorId: string, juniorId: string) => void;
}) {
  return (
    <Card className="border-primary/20" data-testid="tsukebito-panel">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Tsukebito Assignments</span>
        </div>

        {/* Current assignments */}
        {projection.assignments.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              Current
            </span>
            {projection.assignments.map((a) => (
              <div
                key={a.seniorId}
                className="p-3 rounded-lg border border-border/50 bg-muted/10"
                data-testid={`tsukebito-assignment-${a.seniorId}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{a.seniorShikona}</span>
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                    {a.seniorRankLabel}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {a.tsukebito.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span>{t.shikona}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onClear(a.seniorId, t.id)}
                        className="h-6 px-2 gap-1"
                        data-testid={`clear-tsukebito-${a.seniorId}-${t.id}`}
                      >
                        <X className="h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Eligible seniors for new assignments */}
        {projection.eligibleSeniors.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              Assign New
            </span>
            {projection.eligibleSeniors.map((s) => {
              const availableJuniors = projection.eligibleJuniors.filter(
                (j) => !j.assignedTo
              );
              const canAssign = s.currentCount < s.maxCount && availableJuniors.length > 0;
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-lg border border-border/50"
                  data-testid={`tsukebito-senior-${s.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">{s.shikona}</span>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                      {s.rankLabel}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] ml-auto">
                      {s.currentCount}/{s.maxCount}
                    </Badge>
                  </div>
                  {canAssign ? (
                    <div className="flex flex-wrap gap-1">
                      {availableJuniors.map((j) => (
                        <Button
                          key={j.id}
                          size="sm"
                          variant="outline"
                          onClick={() => onSet(s.id, j.id)}
                          className="h-6 text-xs gap-1"
                          data-testid={`set-tsukebito-${s.id}-${j.id}`}
                        >
                          <Plus className="h-3 w-3" />
                          {j.shikona}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {s.currentCount >= s.maxCount
                        ? "At maximum capacity"
                        : "No available juniors"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {projection.eligibleSeniors.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No eligible sekitori (sekiwake+) in your stable.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
