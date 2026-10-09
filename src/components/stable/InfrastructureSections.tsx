/**
 * InfrastructureSections.tsx
 *
 * Infrastructure dashboard sections — overview stat cards, the per-facility
 * card (bonuses, construction status, upgrade action), and facility icons.
 */

import { cn } from "@/lib/utils";
import { formatYen } from "@/utils/engineUtils";
import {
  Building2,
  HardHat,
  TrendingUp,
  Zap,
  Activity,
  Box,
  Clock,
  ArrowUpRight,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FACILITY_REGISTRY, FacilityId } from "@/engine/types/infrastructure";
import type { Heya } from "@/engine/types/heya";

type InfraState = NonNullable<Heya["infrastructure"]>[string];
type ConstructionProject = NonNullable<Heya["constructionQueue"]>[number];

/** Overview stats — active facility count, construction queue, upkeep. */
export function InfrastructureOverview({
  infra,
  queueLength,
}: {
  infra: NonNullable<Heya["infrastructure"]>;
  queueLength: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Building2 className="h-3 w-3 text-primary" /> Active Facilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-display font-black">
            {Object.keys(infra).length}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {Object.keys(FACILITY_REGISTRY).length}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-warning/5 border-warning/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <HardHat className="h-3 w-3 text-warning" /> Under Construction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-display font-black text-warning">
            {queueLength}{" "}
            <span className="text-sm font-normal text-muted-foreground">Active Projects</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-success/5 border-success/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-success" /> Maintenance Wall
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-display font-black text-success">
            {formatYen(
              Object.entries(infra).reduce(
                (sum, [id, s]) =>
                  s?.status === "active"
                    ? sum + (FACILITY_REGISTRY[id as FacilityId]?.maintenanceCost ?? 0)
                    : sum,
                0
              )
            )}{" "}
            <span className="text-sm font-normal text-muted-foreground">/ month</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Impact & Efficiency bonus list for a facility definition. */
function BonusList({ facility }: { facility: (typeof FACILITY_REGISTRY)[FacilityId] }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
        Impact & Efficiency
      </div>
      {Object.entries(facility.bonuses.statBuffs || {}).map(([stat, val]) => (
        <div key={stat} className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground capitalize">{stat} Growth</span>
          <span className="font-black text-primary">+{Math.round((val - 1) * 100)}%</span>
        </div>
      ))}
      {facility.bonuses.injuryHealMod && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Recovery Speed</span>
          <span className="font-black text-success">{facility.bonuses.injuryHealMod} Days</span>
        </div>
      )}
      {facility.bonuses.mediaMod && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Media Visibility</span>
          <span className="font-black text-primary">
            +{Math.round((facility.bonuses.mediaMod - 1) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

/** Facility card — icon, level, bonuses, construction state, upgrade CTA. */
export function FacilityCard({
  facility,
  state,
  project,
  onUpgrade,
}: {
  facility: (typeof FACILITY_REGISTRY)[FacilityId];
  state: InfraState | undefined;
  project: ConstructionProject | undefined;
  onUpgrade: (facilityId: FacilityId) => void;
}) {
  const level = state?.level || 0;
  const isActive = state?.status === "active";
  const isBuilding = !!project;

  return (
    <Card
      className={cn(
        "paper transition-all group relative overflow-hidden",
        isActive ? "border-primary/40 bg-card" : "border-dashed opacity-80"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div
            className={cn(
              "p-2 rounded-lg mb-2",
              isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {getFacilityIcon(facility.id)}
          </div>
          {level > 0 && (
            <Badge variant="outline" className="font-black">
              LV. {level}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg font-black uppercase tracking-tighter">
          {facility.label}
        </CardTitle>
        <CardDescription className="text-[10px] uppercase font-bold tracking-widest h-8 line-clamp-2">
          {facility.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Construction status — no progress datum exists in the queue
            entries, so only the recorded ETA is shown. */}
        {isBuilding && (
          <div className="space-y-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-warning">
              <span>Construction Underway</span>
              <span>
                ETA: {project.completionBasho} {project.completionYear}
              </span>
            </div>
          </div>
        )}

        <BonusList facility={facility} />

        <div className="pt-2">
          <Button
            variant={isActive ? "outline" : "default"}
            className={cn(
              "w-full font-black uppercase tracking-widest text-[10px] h-10 gap-2",
              isBuilding && "opacity-50 cursor-not-allowed"
            )}
            disabled={isBuilding}
            onClick={() => onUpgrade(facility.id)}
            tooltip={isBuilding ? "Facility is currently under construction" : undefined}
            tooltipSide="top"
          >
            {isBuilding ? (
              <>
                <Clock className="h-3 w-3" /> Building...
              </>
            ) : (
              <>
                <ArrowUpRight className="h-3 w-3" />
                {level === 0 ? "Commission Facility" : "Renovate Facility"}
              </>
            )}
          </Button>
          <p className="text-[7px] text-center mt-2 text-muted-foreground uppercase font-black tracking-widest">
            Build Cost: {formatYen(Math.round(facility.baseCost * (1 + level * 0.8)))} |
            Maintenance: {formatYen(facility.maintenanceCost)}/mo
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getFacilityIcon(id: string) {
  switch (id) {
    case "weights_room":
      return <Dumbbell className="h-5 w-5" />;
    case "medical_suite":
      return <Activity className="h-5 w-5" />;
    case "media_studio":
      return <Zap className="h-5 w-5" />;
    case "traditional_kitchen":
      return <Box className="h-5 w-5" />;
    case "video_lab":
      return <TrendingUp className="h-5 w-5" />;
    default:
      return <Building2 className="h-5 w-5" />;
  }
}

function Dumbbell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6.5 6.5 11 11" />
      <path d="m10 10 5.5 5.5" />
      <path d="m15 15 2 2" />
      <path d="m3.5 14.5 6-6" />
      <path d="m4.5 15.5 5-5" />
      <path d="m5.5 16.5 4-4" />
      <path d="M15.5 4.5 21 10" />
      <path d="M14.5 3.5 20.5 9.5" />
      <path d="M16.5 5.5 20 9" />
      <path d="M10 21l-6-6" />
      <path d="M9.5 20.5 3.5 14.5" />
      <path d="M9 20l-5.5-5.5" />
      <path d="m14 3.5 6.5 6.5" />
    </svg>
  );
}
