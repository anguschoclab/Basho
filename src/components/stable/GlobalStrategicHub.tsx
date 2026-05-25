import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Globe, GraduationCap, MapPin, TrendingUp, Users, Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
// eslint-disable-next-line no-restricted-imports
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import { listVisibleCandidates } from "@/engine/systems/generation/TalentPoolScouting";
import { FACILITY_REGISTRY, type FacilityId } from "@/engine/types/infrastructure";

interface GlobalStrategicHubProps {
  world: WorldState;
  heyaId: Id;
}

/**
 * Renders the global strategic hub for a heya, focusing on international influence, academies, and the Global Cup.
 * Displays regional presence levels, available foreign candidates, and active academies with their benefits.
 *
 * @param {GlobalStrategicHubProps} props - The component props.
 * @param {WorldState} props.world - The current global world state.
 * @param {Id} props.heyaId - The ID of the heya whose strategic hub is being displayed.
 * @returns {JSX.Element | null} The rendered strategic hub or null if the heya is not found.
 */
export function GlobalStrategicHub({ world, heyaId }: GlobalStrategicHubProps) {
  const heya = world.heyas.get(heyaId);

  // Use useMemo for presence to avoid recreating object on every render
  const presence = useMemo(() => {
    if (!heya) return { Mongolia: 0, Georgia: 0, Europe: 0, Americas: 0 };
    return heya.regionalPresence || { Mongolia: 0, Georgia: 0, Europe: 0, Americas: 0 };
  }, [heya]);

  const regions = useMemo(() => Object.keys(presence).sort(), [presence]);

  const foreignCandidates = useMemo(() => {
    if (!heya) return [];
    return listVisibleCandidates(world, "foreign").filter((c) => presence[c.originRegion] >= 40);
  }, [world, presence, heya]);

  const activeAcademies = useMemo(() => {
    if (!heya) return [];
    return Object.entries(heya.infrastructure || {})
      .filter(([id, state]) => id.startsWith("academy_") && state.status === "active")
      .map(([id]) => id);
  }, [heya]);

  // Global Cup participation
  const globalCup = world.globalCup;
  const heyaParticipants = useMemo(() => {
    if (!globalCup) return [];
    return globalCup.participants.filter((p) => p.heyaId === heyaId);
  }, [globalCup, heyaId]);

  // Count historical Global Cup wins for this heya
  const globalCupWins = useMemo(() => {
    if (!heya) return 0;
    return (world.chronicle?.globalCups || []).filter((entry) => entry.championHeya === heya.name)
      .length;
  }, [world.chronicle?.globalCups, heya]);

  if (!heya) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* World Influence Map (Presence) */}
        <Card className="paper border-slate-800">
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
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                  <span>{region}</span>
                  <span>{presence[region]} / 100</span>
                </div>
                <Progress
                  value={presence[region]}
                  className="h-1.5"
                  indicatorClassName={presence[region] >= 80 ? "bg-amber-500" : "bg-blue-600"}
                />
                <div className="flex gap-2">
                  {presence[region] >= 40 && (
                    <Badge variant="secondary" className="text-[9px]">
                      Visibility Unlocked
                    </Badge>
                  )}
                  {presence[region] >= 80 && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20"
                    >
                      Academy Eligible
                    </Badge>
                  )}
                  {activeAcademies.includes(`academy_${region.toLowerCase()}`) && (
                    <Badge
                      variant="outline"
                      className="text-[9px] border-emerald-500/30 text-emerald-400 flex items-center gap-1"
                    >
                      <GraduationCap className="h-2 w-2" /> Academy Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Global Talent Pipeline */}
        <Card className="paper border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-xl font-display uppercase tracking-tight">
                International Pipeline
              </CardTitle>
            </div>
            <CardDescription>
              Visible candidates discovered through regional presence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {foreignCandidates.slice(0, 5).map((c) => (
                <div
                  key={c.candidateId}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                      {c.originRegion.substring(0, 3)}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{c.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                        {c.archetype} | {c.originRegion}
                      </div>
                    </div>
                  </div>
                  {c.tags.includes("legacy") && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/20 text-[8px]">
                      LEGACY
                    </Badge>
                  )}
                </div>
              ))}
              {foreignCandidates.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  <MapPin className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-xs">
                    No foreign candidates visible. Increase Regional Presence to 40+ to unlock
                    scouting.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Cup Participation */}
      {globalCup && heyaParticipants.length > 0 && (
        <Card className="glass border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Global Cup {globalCup.year}
              </CardTitle>
              <Link to="/global-cup" className="text-[10px] text-amber-400 hover:underline">
                View Tournament →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-display font-bold text-amber-400">
                {heyaParticipants.length}
              </div>
              <div className="text-sm text-slate-400">
                {heyaParticipants.length === 1 ? "Representative" : "Representatives"} in tournament
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {heyaParticipants.map((p) => (
                <Badge
                  key={p.rikishiId}
                  variant="outline"
                  className="text-[10px] border-amber-500/30 text-amber-300"
                >
                  #{p.seed} {p.shikona}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Global Cup Record */}
      {globalCupWins > 0 && (
        <Card className="paper border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-400">
              <Trophy className="h-5 w-5" />
              Global Cup Legacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold text-amber-400">{globalCupWins}</div>
            <p className="text-sm text-muted-foreground mt-1">
              All-time Global Cup championships by members of this stable.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Academy Benefits & Status */}
      {activeAcademies.length > 0 && (
        <Card className="glass border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Established Academies
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {activeAcademies.map((id) => {
              const def = FACILITY_REGISTRY[id as FacilityId];
              return (
                <div
                  key={id}
                  className="p-3 rounded-lg border border-emerald-500/10 bg-slate-950/40"
                >
                  <div className="text-xs font-bold text-slate-200">{def?.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    {def?.description}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-emerald-500 font-bold text-[10px]">
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
      )}
    </div>
  );
}
