import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { PerceptionSnapshot } from "@/engine/perception";
import { BaseWidget } from "./BaseWidget";
import { getCachedPerception } from "@/presenters/uiDigest";
import {
  Building2,
  Heart,
  Shield,
  Users,
  Handshake,
  UserPlus,
  Briefcase,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const BAND_COLORS: Record<string, string> = {
  inspired: "text-emerald-500",
  content: "text-green-500",
  safe: "text-emerald-500",
  dominant: "text-primary",
  strong: "text-primary/80",
  secure: "text-primary",
  comfortable: "text-green-500/80",
  powerful: "text-primary",
  hot: "text-primary",
  neutral: "text-muted-foreground",
  competitive: "text-muted-foreground",
  normal: "text-muted-foreground",
  cautious: "text-muted-foreground",
  cold: "text-muted-foreground",
  dormant: "text-muted-foreground",
  simmering: "text-muted-foreground",
  moderate: "text-muted-foreground",
  none: "text-muted-foreground",
  developing: "text-muted-foreground",
  warm: "text-muted-foreground",
  tight: "text-yellow-500",
  disgruntled: "text-orange-500",
  elevated: "text-yellow-500",
  weak: "text-destructive/70",
  blazing: "text-destructive",
  fierce: "text-destructive",
  critical: "text-destructive",
  mutinous: "text-red-500",
  desperate: "text-red-600",
  severe: "text-red-500",
};

/** stable widget. */
export function StableWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const p = useMemo<PerceptionSnapshot | null>(() => {
    if (!world?.playerHeyaId) return null;
    return getCachedPerception(world, world.playerHeyaId);
  }, [world]);

  if (!p) return null;

  const headerAction = useMemo(
    () => ({
      label: "Manage",
      onClick: () => navigate({ to: "/stable" as any }),
    }),
    [navigate],
  );

  return (
    <BaseWidget
      title="Stable Overview"
      icon={Building2}
      headerAction={headerAction}
    >
      <div className="space-y-4">
        {/* Tier & Reputation */}
        <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg border border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">
                Stature
              </div>
              <div className="text-sm font-bold leading-none">
                {p.statureBand.toUpperCase()}
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] font-bold uppercase tracking-tighter border-primary/30 text-primary"
          >
            {p.prestigeBand}
          </Badge>
        </div>

        {/* Vital Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatMini
            icon={<Heart className="h-3 w-3" />}
            label="Morale"
            value={p.moraleBand}
          />
          <StatMini
            icon={<Shield className="h-3 w-3" />}
            label="Security"
            value={p.welfareRiskBand}
          />
          <StatMini
            icon={<Users className="h-3 w-3" />}
            label="Roster"
            value={p.rosterStrengthBand}
          />
          <StatMini
            icon={<Handshake className="h-3 w-3" />}
            label="Koenkai"
            value={p.koenkaiBand}
          />
        </div>

        {/* Development Progress */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="h-3 w-3" /> Staff Development
              </span>
              <span className="text-foreground">Level 3 / 5</span>
            </div>
            <Progress value={60} className="h-1" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <UserPlus className="h-3 w-3" /> Naturalization
              </span>
              <span className="text-foreground">Years: 4 / 10</span>
            </div>
            <Progress value={40} className="h-1 bg-muted/50" />
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}

function StatMini({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const color = BAND_COLORS[value.toLowerCase()] || "text-muted-foreground";
  return (
    <div className="flex flex-col gap-1 p-2 rounded-md border border-border/40 bg-card/50">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-70">
        {icon}
        {label}
      </div>
      <div className={cn("text-xs font-bold leading-none truncate", color)}>
        {value.toUpperCase()}
      </div>
    </div>
  );
}
