/**
 * AcademyIntakeCard — displays a single youth academy prospect.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import type { YouthProspectDTO } from "@/presenters/youthAcademyProjections";

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
          <span className="font-display text-sm font-semibold">{prospect.shikona}</span>
          <Badge variant="outline" className="text-[9px]">
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
            <span className="font-mono">{prospect.currentAbility}/{prospect.potential}</span>
          </div>
          <Progress value={developmentPercent} className="h-1.5" />
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
