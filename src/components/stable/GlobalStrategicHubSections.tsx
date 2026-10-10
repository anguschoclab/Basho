/**
 * GlobalStrategicHubSections.tsx
 *
 * Sections of GlobalStrategicHub — regional influence map, international
 * pipeline, Global Cup participation/legacy, and established academies.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Globe, GraduationCap, MapPin, TrendingUp, Users, Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FACILITY_REGISTRY, type FacilityId } from "@/engine/types/infrastructure";
import type { useGlobalStrategicDerived } from "@/hooks/useGlobalStrategicDerived";

type Derived = ReturnType<typeof useGlobalStrategicDerived>;

/** Regional presence map with unlock badges. */
export function InfluenceCard({
  presence,
  regions,
  activeAcademies,
}: {
  presence: Derived["presence"];
  regions: string[];
  activeAcademies: string[];
}) {
  return (
    <Card className="paper border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-display uppercase tracking-tight">
            Global Influence
          </CardTitle>
        </div>
        <CardDescription>
          Stable reputation and presence across international regions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {regions.map((region) => (
          <div key={region} className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span>{region}</span>
              <span>{presence[region]} / 100</span>
            </div>
            <Progress
              value={presence[region]}
              className="h-1.5"
              indicatorClassName={presence[region] >= 80 ? "bg-gold" : "bg-primary"}
            />
            <div className="flex gap-2">
              {presence[region] >= 40 && (
                <Badge variant="secondary" className="text-[10px]">
                  Visibility Unlocked
                </Badge>
              )}
              {presence[region] >= 80 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-gold/10 text-gold border-gold/20"
                >
                  Academy Eligible
                </Badge>
              )}
              {activeAcademies.includes(`academy_${region.toLowerCase()}`) && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-success/30 text-success flex items-center gap-1"
                >
                  <GraduationCap className="h-2 w-2" /> Academy Active
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Visible foreign candidates unlocked by regional presence. */
export function PipelineCard({ candidates }: { candidates: Derived["foreignCandidates"] }) {
  return (
    <Card className="paper border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gold" />
          <CardTitle className="text-xl font-display uppercase tracking-tight">
            International Pipeline
          </CardTitle>
        </div>
        <CardDescription>Visible candidates discovered through regional presence.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {candidates.slice(0, 5).map((c) => (
            <div
              key={c.candidateId}
              className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-[10px] font-bold">
                  {c.originRegion.substring(0, 3)}
                </div>
                <div>
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    {c.archetype} | {c.originRegion}
                  </div>
                </div>
              </div>
              {c.tags.includes("legacy") && (
                <Badge className="bg-gold/20 text-gold border-gold/20 text-[10px]">LEGACY</Badge>
              )}
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border border-dashed border-border rounded-lg">
              <MapPin className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-xs">
                No foreign candidates visible. Increase Regional Presence to 40+ to unlock scouting.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Active Global Cup participation banner. */
export function GlobalCupCard({
  globalCup,
  heyaParticipants,
}: {
  globalCup: NonNullable<Derived["globalCup"]>;
  heyaParticipants: Derived["heyaParticipants"];
}) {
  return (
    <Card className="glass border-gold/20 bg-gold/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Global Cup {globalCup.year}
          </CardTitle>
          <Link to="/global-cup" className="text-[10px] text-gold hover:underline">
            View Tournament →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-display font-bold text-gold">{heyaParticipants.length}</div>
          <div className="text-sm text-muted-foreground">
            {heyaParticipants.length === 1 ? "Representative" : "Representatives"} in tournament
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {heyaParticipants.map((p) => (
            <Badge
              key={p.rikishiId}
              variant="outline"
              className="text-[10px] border-gold/30 text-gold"
            >
              #{p.seed} {p.shikona}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** All-time Global Cup wins by the heya. */
export function GlobalCupLegacyCard({ wins }: { wins: number }) {
  return (
    <Card className="paper border-gold/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-gold">
          <Trophy className="h-5 w-5" />
          Global Cup Legacy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-display font-bold text-gold">{wins}</div>
        <p className="text-sm text-muted-foreground mt-1">
          All-time Global Cup championships by members of this stable.
        </p>
      </CardContent>
    </Card>
  );
}

/** Established regional academies and their bonuses. */
export function AcademiesCard({ activeAcademies }: { activeAcademies: string[] }) {
  return (
    <Card className="glass border-success/20 bg-success/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-success flex items-center gap-2">
          <GraduationCap className="h-4 w-4" /> Established Academies
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {activeAcademies.map((id) => {
          const def = FACILITY_REGISTRY[id as FacilityId];
          return (
            <div key={id} className="p-3 rounded-lg border border-success/10 bg-card/40">
              <div className="text-xs font-bold text-muted-foreground">{def?.label}</div>
              <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                {def?.description}
              </div>
              <div className="mt-2 flex items-center gap-1 text-success font-bold text-[10px]">
                <TrendingUp className="h-3 w-3" />
                {Object.entries(def?.bonuses?.statBuffs || {})
                  .map(([s, b]) => `${s}+${Math.round((b - 1) * 100)}%`)
                  .join(", ")}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
