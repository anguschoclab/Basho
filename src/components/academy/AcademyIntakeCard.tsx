/**
 * AcademyIntakeCard — displays a single youth academy prospect.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, ReferenceLine } from "recharts";
import type { YouthProspectDTO } from "@/presenters/projections/youthAcademyProjections";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { resolveAvatar, prospectStageInput } from "@/presenters/projections/avatarProjections";

interface AcademyIntakeCardProps {
  prospect: YouthProspectDTO;
  onPromote?: (prospectId: string) => void;
}

export function AcademyIntakeCard({ prospect, onPromote }: AcademyIntakeCardProps) {
  const developmentPercent =
    prospect.potential > 0
      ? Math.min(100, Math.round((prospect.currentAbility / prospect.potential) * 100))
      : 0;

  return (
    <Card data-testid={`intake-card-${prospect.id}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SumoAvatar
              avatar={resolveAvatar({
                id: prospect.id,
                stored: prospect.avatarConfig,
                ...prospectStageInput(prospect),
              })}
              size="xs"
              fallback={prospect.shikona}
            />
            <span className="font-display text-sm font-semibold">{prospect.shikona}</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Age {prospect.age}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{prospect.region}</span>
          <span>•</span>
          <span>Potential {prospect.potential}</span>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Development</span>
            <span className="font-mono">
              {prospect.currentAbility}/{prospect.potential}
            </span>
          </div>
          <Progress value={developmentPercent} className="h-1.5" />
        </div>
        {/* Weekly ability readings vs. potential ceiling — is this prospect
            still developing or fully cooked? History is a step function:
            ability is integer-quantized and ticks only in the off-season. */}
        <div className="flex items-center gap-2" data-testid={`growth-${prospect.id}`}>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Growth
          </span>
          {prospect.developmentHistory.length >= 2 ? (
            <div className="flex-1 h-7 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prospect.developmentHistory}>
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ fontSize: 10, padding: "2px 6px" }}
                    formatter={(v) => [`${Math.round(Number(v) || 0)}`, "Ability"]}
                    labelFormatter={(w) => `Week ${w}`}
                  />
                  <ReferenceLine
                    y={prospect.potential}
                    stroke="hsl(var(--gold) / 0.6)"
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="stepAfter"
                    dataKey="ability"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </div>
        {onPromote && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onPromote(prospect.id)}
            data-testid={`promote-${prospect.id}`}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Promote to Heya
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
