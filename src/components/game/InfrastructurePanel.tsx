import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Construction, CheckCircle2, Clock } from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import { FACILITY_REGISTRY, type FacilityId } from "@/engine/types/infrastructure";
import { formatYen } from "@/utils/engineUtils";

interface InfrastructurePanelProps {
  heya: Heya;
  onBuild: (facilityId: FacilityId) => void;
}

const FACILITY_ORDER: FacilityId[] = [
  "weights_room",
  "medical_suite",
  "media_studio",
  "traditional_kitchen",
  "video_lab",
  "scouting_office",
  "academy_mongolia",
  "academy_georgia",
  "academy_europe",
  "academy_americas",
];

export function InfrastructurePanel({ heya, onBuild }: InfrastructurePanelProps) {
  const infra = heya.infrastructure || {};
  const queue = heya.constructionQueue || [];

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Stable Buildings
        </CardTitle>
        <CardDescription>
          Discrete facilities that provide permanent bonuses. Construction takes time — plan ahead.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {FACILITY_ORDER.map((id) => {
            const def = FACILITY_REGISTRY[id];
            const state = infra[id];
            const inQueue = queue.some((q) => q.facilityId === id);
            const level = state?.level ?? 0;
            const status = state?.status;
            const isActive = status === "active";
            const isBuilding = status === "under_construction" || inQueue;
            const canAfford = heya.funds >= def.baseCost;

            return (
              <div
                key={id}
                className={`rounded-lg border p-3 space-y-2 ${
                  isActive
                    ? "border-success/40 bg-success/5"
                    : isBuilding
                      ? "border-warning/40 bg-warning/5"
                      : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{def.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
                  </div>
                  {isActive && (
                    <Badge
                      variant="outline"
                      className="text-xs text-success border-success/40 shrink-0"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Lv {level}
                    </Badge>
                  )}
                  {isBuilding && (
                    <Badge
                      variant="outline"
                      className="text-xs text-warning border-warning/40 shrink-0"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Building
                    </Badge>
                  )}
                </div>

                {/* Bonuses */}
                <div className="text-xs text-muted-foreground">
                  {def.bonuses.statBuffs &&
                    Object.entries(def.bonuses.statBuffs).map(([stat, mult]) => (
                      <span key={stat} className="mr-2">
                        +{Math.round((mult - 1) * 100)}% {stat}
                      </span>
                    ))}
                  {def.bonuses.injuryHealMod && (
                    <span className="mr-2">{def.bonuses.injuryHealMod} days recovery</span>
                  )}
                  {def.bonuses.mediaMod && (
                    <span className="mr-2">
                      +{Math.round((def.bonuses.mediaMod - 1) * 100)}% media
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatYen(def.baseCost)} · {def.buildTimeBasho} basho
                  </span>
                  {!isActive && !isBuilding && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      disabled={!canAfford}
                      onClick={() => onBuild(id)}
                    >
                      <Construction className="h-3 w-3" />
                      Build
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
