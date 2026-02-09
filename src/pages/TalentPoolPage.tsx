import { useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { Search, UserPlus, Globe, GraduationCap, School } from "lucide-react";

import type { TalentPoolType, TalentCandidate } from "@/engine/types";
import * as talentpool from "@/engine/talentpool";

function poolLabel(pool: TalentPoolType): string {
  switch (pool) {
    case "high_school":
      return "High School";
    case "university":
      return "University";
    case "foreign":
      return "Foreign";
  }
}

function poolIcon(pool: TalentPoolType) {
  switch (pool) {
    case "high_school":
      return School;
    case "university":
      return GraduationCap;
    case "foreign":
      return Globe;
  }
}

function visibilityLabel(v: TalentCandidate["visibilityBand"]): string {
  switch (v) {
    case "public":
      return "Public";
    case "rumored":
      return "Rumored";
    case "obscure":
      return "Obscure";
    case "hidden":
      return "Hidden";
  }
}

export default function TalentPoolPage() {
  const { state, updateWorld } = useGame();
  const world = state.world;
  const [activePool, setActivePool] = useState<TalentPoolType>("high_school");

  const playerHeyaId = world?.playerHeyaId;
  const playerHeya = world && playerHeyaId ? world.heyas.get(playerHeyaId) : null;
  const foreignCount = useMemo(() => {
    if (!world || !playerHeyaId) return 0;
    return talentpool.getForeignCountInHeya(world, playerHeyaId);
  }, [world, playerHeyaId]);

  const candidates = useMemo(() => {
    if (!world) return [] as TalentCandidate[];
    return talentpool.listVisibleCandidates(world, activePool);
  }, [world, activePool]);

  if (!world) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Talent Pools</CardTitle>
            <CardDescription>Load or create a world to view prospects.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const onReveal = () => {
    const res = talentpool.scoutPool(world, activePool, { revealCount: 1 });
    updateWorld({ ...world });
    if (res.revealed.length === 0) {
      toast({ title: "No new leads", description: "Your scouts found nobody new this week (or you lack funds)." });
      return;
    }
    toast({
      title: "New lead discovered",
      description: `Your scouts surfaced ${res.revealed.length} new prospect${res.revealed.length === 1 ? "" : "s"}.`,
    });
  };

  const onScout = (candidateId: string) => {
    const res = talentpool.scoutCandidate(world, candidateId, { effort: 1 });
    updateWorld({ ...world });
    if (!res.ok) {
      toast({ title: "Scouting failed", description: "You may not have enough funds." });
      return;
    }
    toast({ title: "Scouting report updated", description: `Intel level: ${res.scoutingLevel}%` });
  };

  const onOffer = (candidateId: string) => {
    if (!playerHeyaId) {
      toast({ title: "No stable selected", description: "Choose a player stable first." });
      return;
    }
    const res = talentpool.offerCandidate(world, candidateId, playerHeyaId, "standard", "high");
    updateWorld({ ...world });
    if (!res.ok) {
      toast({ title: "Offer blocked", description: res.reason });
      return;
    }
    toast({ title: "Offer submitted", description: "The prospect will decide within a few weeks." });
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Talent Pools</CardTitle>
          <CardDescription>
            Persistent recruit pipelines: prospects exist before they enter sumo. Scout to reveal, then make offers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {playerHeya && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">My Stable</div>
                <div className="font-semibold">{playerHeya.name}</div>
              </div>
              <div className="text-sm text-muted-foreground flex flex-col items-end">
                <div>Funds: ¥{(playerHeya.funds ?? 0).toLocaleString()}</div>
                <div className="text-xs">Foreigners: {foreignCount}/{talentpool.FOREIGN_RIKISHI_LIMIT_PER_HEYA}</div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onReveal}>
              <Search className="h-4 w-4 mr-2" />
              Search for leads
            </Button>
            <div className="text-xs text-muted-foreground">
              This reveals hidden candidates into the list. Scouting a candidate increases intel quality.
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activePool} onValueChange={(v) => setActivePool(v as TalentPoolType)}>
        <TabsList>
          {(["high_school", "university", "foreign"] as TalentPoolType[]).map((pt) => {
            const I = poolIcon(pt);
            return (
              <TabsTrigger key={pt} value={pt}>
                <I className="h-4 w-4 mr-2" />
                {poolLabel(pt)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(["high_school", "university", "foreign"] as TalentPoolType[]).map((pt) => (
          <TabsContent key={pt} value={pt}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {candidates.length === 0 ? (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardHeader>
                    <CardTitle>No visible prospects</CardTitle>
                    <CardDescription>Use “Search for leads” to surface candidates from the hidden reserve.</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                candidates.map((c) => {
                  const intel = talentpool.getCandidateScoutingLevel(world, c.candidateId);
                  const canShowName = c.visibilityBand === "public" || intel >= 65;
                  const canShowDetails = c.visibilityBand === "public" || intel >= 35;
                  const title = canShowName ? c.name : "Unknown Prospect";
                  const sub = visibilityLabel(c.visibilityBand);

                  return (
                    <Card key={c.candidateId} className="overflow-hidden">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{title}</CardTitle>
                            <CardDescription>{sub}</CardDescription>
                          </div>
                          {c.tags.includes("amateur_star") && <Badge>Star</Badge>}
                          {(c.nationality ?? "Japan") !== "Japan" && <Badge variant="secondary">Foreign</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="text-muted-foreground">Intel</div>
                            <div className="font-mono">{intel}%</div>
                          </div>
                          <Progress value={intel} />
                        </div>

                        <Separator />

                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Age</span>
                            <span>{world.year - c.birthYear}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Origin</span>
                            <span>{canShowDetails ? c.originRegion : "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Style</span>
                            <span>{canShowDetails ? c.style : "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Archetype</span>
                            <span>{canShowDetails ? c.archetype.replace(/_/g, " ") : "—"}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="secondary" className="flex-1" onClick={() => onScout(c.candidateId)}>
                            <Search className="h-4 w-4 mr-2" />
                            Scout
                          </Button>
                          <Button className="flex-1" onClick={() => onOffer(c.candidateId)} disabled={!playerHeyaId}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Offer
                          </Button>
                        </div>

                        {c.availabilityState === "in_talks" && (
                          <div className="text-xs text-muted-foreground">
                            In talks with {c.competingSuitors.length} stable{c.competingSuitors.length === 1 ? "" : "s"}.
                            {intel >= 35 && c.competingSuitors.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {c.competingSuitors.slice(0, 4).map((s) => {
                                  const h = world.heyas.get(s.heyaId);
                                  const oy = h ? world.oyakata.get(h.oyakataId) : null;
                                  return (
                                    <div key={s.heyaId} className="flex justify-between">
                                      <span>{h?.name ?? s.heyaId}</span>
                                      <span className="opacity-80">{oy?.archetype ?? "oyakata"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
