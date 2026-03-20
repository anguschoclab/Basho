// StableOverviewPanel.tsx — Player's own stable perception bands (A7.1)
// Displays narrative labels only, never raw numbers.

import { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCachedPerception, type PerceptionSnapshot } from "@/engine/perception";
import { getSponsorshipDetails } from "@/engine/uiDigest";
import {
  Shield, Heart, Flame, Swords, Users,
  TrendingUp, Building2, HandCoins, AlertTriangle
} from "lucide-react";

// Band → narrative label + semantic color class
const BAND_CONFIG = {
  morale: {
    inspired:    { label: "Inspired",    icon: "☀", color: "text-primary" },
    content:     { label: "Content",     icon: "😊", color: "text-primary/70" },
    neutral:     { label: "Neutral",     icon: "—",  color: "text-muted-foreground" },
    disgruntled: { label: "Disgruntled", icon: "😤", color: "text-destructive/70" },
    mutinous:    { label: "Mutinous",    icon: "🔥", color: "text-destructive" },
  },
  welfare: {
    safe:     { label: "Safe",     color: "text-primary",          bg: "bg-primary/10" },
    cautious: { label: "Cautious", color: "text-muted-foreground", bg: "bg-muted" },
    elevated: { label: "Elevated", color: "text-destructive/70",   bg: "bg-destructive/10" },
    critical: { label: "Critical", color: "text-destructive",      bg: "bg-destructive/15" },
  },
  media: {
    cold:    { label: "Cold",    color: "text-muted-foreground" },
    warm:    { label: "Warm",    color: "text-primary/70" },
    hot:     { label: "Hot",     color: "text-primary" },
    blazing: { label: "Blazing", color: "text-destructive" },
  },
  rivalry: {
    dormant:   { label: "Quiet",     color: "text-muted-foreground" },
    simmering: { label: "Simmering", color: "text-muted-foreground" },
    heated:    { label: "Heated",    color: "text-primary" },
    fierce:    { label: "Fierce",    color: "text-destructive" },
  },
  roster: {
    dominant:    { label: "Dominant",    color: "text-primary" },
    strong:      { label: "Strong",      color: "text-primary/80" },
    competitive: { label: "Competitive", color: "text-muted-foreground" },
    developing:  { label: "Developing",  color: "text-muted-foreground" },
    weak:        { label: "Weak",        color: "text-destructive/70" },
  },
  governance: {
    none:     { label: "None",     color: "text-primary" },
    mild:     { label: "Mild",     color: "text-muted-foreground" },
    moderate: { label: "Moderate", color: "text-destructive/70" },
    severe:   { label: "Severe",   color: "text-destructive" },
  },
} as const;

/**
 * band row.
 *  * @param { icon, label, value, color } - The { icon, label, value, color }.
 */
function BandRow({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-sm font-medium capitalize ${color}`}>{value}</span>
    </div>
  );
}

/** stable overview panel. */
export function StableOverviewPanel() {
  const { state } = useGame();
  const world = state.world;

  const perception = useMemo<PerceptionSnapshot | null>(() => {
    if (!world?.playerHeyaId) return null;
    return getCachedPerception(world, world.playerHeyaId);
  }, [world]);

  const sponsorshipDetails = world?.playerHeyaId ? getSponsorshipDetails(world, world.playerHeyaId) : null;

  if (!perception) return null;

  const morale = BAND_CONFIG.morale[perception.moraleBand];
  const welfare = BAND_CONFIG.welfare[perception.welfareRiskBand];
  const media = BAND_CONFIG.media[perception.stableMediaHeatBand];
  const rivalry = BAND_CONFIG.rivalry[perception.rivalryPressureBand];
  const roster = BAND_CONFIG.roster[perception.rosterStrengthBand];
  const governance = BAND_CONFIG.governance[perception.governancePressureBand];

  // Count health concerns
  const fragileCount = perception.rikishiPerceptions.filter(
    r => r.healthBand === "fragile" || r.healthBand === "worn"
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Stable Overview
          </CardTitle>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="text-[10px] capitalize">
              {perception.statureBand}
            </Badge>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {perception.prestigeBand}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        <BandRow
          icon={<Heart className="h-4 w-4" />}
          label="Morale"
          value={`${morale.icon} ${morale.label}`}
          color={morale.color}
        />
        <BandRow
          icon={<Shield className="h-4 w-4" />}
          label="Welfare Risk"
          value={welfare.label}
          color={welfare.color}
        />
        <BandRow
          icon={<Users className="h-4 w-4" />}
          label="Roster Strength"
          value={roster.label}
          color={roster.color}
        />
        <BandRow
          icon={<Flame className="h-4 w-4" />}
          label="Media Heat"
          value={media.label}
          color={media.color}
        />
        <BandRow
          icon={<Swords className="h-4 w-4" />}
          label="Rivalry Pressure"
          value={rivalry.label}
          color={rivalry.color}
        />
        <BandRow
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Governance Pressure"
          value={governance.label}
          color={governance.color}
        />
        <BandRow
          icon={<HandCoins className="h-4 w-4" />}
          label="Supporters"
          value={sponsorshipDetails?.koenkaiStrengthBand === "none" ? "None" : sponsorshipDetails?.koenkaiStrengthBand ?? "None"}
          color={sponsorshipDetails?.koenkaiStrengthBand === "powerful" || sponsorshipDetails?.koenkaiStrengthBand === "strong"
            ? "text-primary" : "text-muted-foreground"}
        />
        <BandRow
          icon={<TrendingUp className="h-4 w-4" />}
          label="Financial Runway"
          value={perception.runwayBand}
          color={perception.runwayBand === "secure" || perception.runwayBand === "comfortable"
            ? "text-primary"
            : perception.runwayBand === "critical" || perception.runwayBand === "desperate"
            ? "text-destructive"
            : "text-muted-foreground"}
        />

        {/* Health summary */}
        {fragileCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-destructive/80">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{fragileCount} wrestler{fragileCount > 1 ? "s" : ""} with health concerns</span>
          </div>
        )}

        {/* Style bias */}
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>Training Style</span>
          <Badge variant="outline" className="text-[10px] capitalize">
            {perception.styleBias === "neutral" ? "Balanced" : `${perception.styleBias}-leaning`}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
