import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCachedPerception, type PerceptionSnapshot } from "@/engine/perception";
import {
  Building2, ChevronRight, Heart, Shield, Users, Flame, TrendingUp, HandCoins,
} from "lucide-react";

const BAND_COLORS: Record<string, string> = {
  inspired: "text-primary", content: "text-primary/80", safe: "text-primary",
  dominant: "text-primary", strong: "text-primary/80", secure: "text-primary",
  comfortable: "text-primary/70", powerful: "text-primary", hot: "text-primary",
  neutral: "text-muted-foreground", competitive: "text-muted-foreground",
  normal: "text-muted-foreground", cautious: "text-muted-foreground",
  cold: "text-muted-foreground", dormant: "text-muted-foreground",
  simmering: "text-muted-foreground", moderate: "text-muted-foreground",
  none: "text-muted-foreground", developing: "text-muted-foreground",
  warm: "text-muted-foreground", tight: "text-warning",
  disgruntled: "text-warning", elevated: "text-warning",
  weak: "text-destructive/70", blazing: "text-destructive",
  fierce: "text-destructive", critical: "text-destructive",
  mutinous: "text-destructive", desperate: "text-destructive",
  severe: "text-destructive",
};

const BAND_ICONS: Record<string, string> = {
  inspired: "☀", content: "😊", neutral: "—", disgruntled: "😤", mutinous: "🔥",
};

/**
 * row.
 *  * @param { icon, label, value } - The { icon, label, value }.
 */
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const color = BAND_COLORS[value.toLowerCase()] || "text-muted-foreground";
  const emoji = BAND_ICONS[value.toLowerCase()];
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-xs font-medium capitalize ${color}`}>
        {emoji ? `${emoji} ` : ""}{value}
      </span>
    </div>
  );
}

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

  return (
    <div className="widget-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stable Status</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] capitalize border-gold/30 text-gold">{p.statureBand}</Badge>
          <Badge variant="secondary" className="text-[10px] capitalize">{p.prestigeBand}</Badge>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        <Row icon={<Heart className="h-3.5 w-3.5" />} label="Morale" value={p.moraleBand} />
        <Row icon={<Shield className="h-3.5 w-3.5" />} label="Welfare" value={p.welfareRiskBand} />
        <Row icon={<Users className="h-3.5 w-3.5" />} label="Roster" value={p.rosterStrengthBand} />
        <Row icon={<TrendingUp className="h-3.5 w-3.5" />} label="Finances" value={p.runwayBand} />
        <Row icon={<Flame className="h-3.5 w-3.5" />} label="Media" value={p.stableMediaHeatBand} />
        <Row icon={<HandCoins className="h-3.5 w-3.5" />} label="Supporters" value={p.koenkaiBand === "none" ? "None" : p.koenkaiBand} />
      </div>

      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/stable" })} className="w-full h-7 text-xs gap-1 text-muted-foreground hover:text-primary transition-colors">
        Manage Stable <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
