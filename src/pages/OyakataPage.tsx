import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import { Brain, Heart, Briefcase, Zap, Scale, Users, Crown, Award } from "lucide-react";
import { YokozunaTsunaDisplay } from "@/components/kesho/KeshoMawashiDisplay";
import { TRAIT_LABELS, getArchetypeDescription, toTraitBand } from "@/presenters/uiDigest";
import { menteesOf } from "@/engine/lineage";
import { RikishiName, OyakataName, StableName } from "@/components/ClickableName";

/** oyakata page. */
export default function OyakataPage() {
  const { state } = useGame();
  const world = state.world;
  const [selectedOyakata, setSelectedOyakata] = useState<Oyakata | null>(null);

  useEffect(() => {
    if (world && world.playerHeyaId) {
      const playerHeya = world.heyas.get(world.playerHeyaId);
      if (playerHeya && playerHeya.oyakataId) {
        const o = world.oyakata.get(playerHeya.oyakataId);
        if (o) setSelectedOyakata(o);
      }
    }
  }, [world]);

  if (!world || !selectedOyakata) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">Loading Oyakata...</div>
      </AppLayout>
    );
  }

  const traits = selectedOyakata.traits;

  const traitItems = [
    { key: "ambition", label: "Ambition", icon: Zap, value: traits.ambition },
    { key: "patience", label: "Patience", icon: Brain, value: traits.patience },
    { key: "risk", label: "Risk Tolerance", icon: Scale, value: traits.risk },
    { key: "tradition", label: "Tradition", icon: Briefcase, value: traits.tradition },
    { key: "compassion", label: "Compassion", icon: Heart, value: traits.compassion },
  ];

  // Get mentorship relationships in the stable
  const heya = world.heyas.get(selectedOyakata.heyaId);
  const mentorshipPairs: Array<{ mentor: Rikishi; mentees: Rikishi[] }> = [];
  if (heya?.rikishiIds) {
    for (const id of heya.rikishiIds) {
      const r = world.rikishi.get(id);
      if (r) {
        const mentees = menteesOf(world, r);
        if (mentees.length > 0) {
          mentorshipPairs.push({ mentor: r, mentees });
        }
      }
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-start gap-6">
          <SumoAvatar
            config={selectedOyakata.avatarConfig}
            size="xl"
            showHairstyle={true}
            fallback={selectedOyakata.name}
            className="border-4 border-primary/30 shadow-xl"
          />

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">
                <OyakataName id={selectedOyakata.id} name={selectedOyakata.name} />
              </h1>
              <Badge variant="outline" className="text-lg capitalize">
                {selectedOyakata.archetype?.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2">
              {getArchetypeDescription(selectedOyakata.archetype)}
            </p>
            <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
              <span>Age: {selectedOyakata.age}</span>
              <span>Years in Charge: {selectedOyakata.yearsInCharge}</span>
            </div>
          </div>
        </div>

        {/* TRAITS */}
        <Card>
          <CardHeader>
            <CardTitle>Personality Traits</CardTitle>
            <CardDescription>
              These traits influence training, scouting, and management decisions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {traitItems.map((trait) => {
                const band = toTraitBand(trait.value);
                return (
                  <div key={trait.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <trait.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{trait.label}</span>
                      <span className="ml-auto text-sm text-muted-foreground">
                        {TRAIT_LABELS[band]}
                      </span>
                    </div>
                    <Progress value={trait.value} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* CAREER AS RIKISHI */}
        {(selectedOyakata.formerShikona || selectedOyakata.highestRank) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" /> Career as Rikishi
              </CardTitle>
              <CardDescription>
                Former wrestling career before becoming a stable master.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {selectedOyakata.formerShikona && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Former Shikona</div>
                    <div className="text-2xl font-bold">{selectedOyakata.formerShikona}</div>
                  </div>
                )}
                {selectedOyakata.highestRank && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Highest Rank Achieved</div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          selectedOyakata.highestRank.toLowerCase() === "yokozuna" ||
                          selectedOyakata.highestRank.toLowerCase() === "ozeki"
                            ? "default"
                            : "outline"
                        }
                        className="text-lg capitalize"
                      >
                        {selectedOyakata.highestRank.toLowerCase() === "yokozuna" && (
                          <Crown className="h-4 w-4 mr-1" />
                        )}
                        {selectedOyakata.highestRank}
                      </Badge>
                    </div>
                  </div>
                )}
                {/* Former Yokozuna Tsuna Display */}
                {selectedOyakata.highestRank?.toLowerCase() === "yokozuna" && (
                  <div className="space-y-2 md:col-span-2 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-yellow-800">
                      <Award className="h-4 w-4" />
                      <span className="font-medium">Yokozuna Legacy</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <YokozunaTsunaDisplay
                        tsuna={{
                          rikishiId: selectedOyakata.id,
                          conferredAt: { year: 2020, basho: "unknown" },
                          style: "traditional",
                          ropeColor: "gold_accented",
                          paperTassels: 5,
                          displayedOnProfile: true,
                          isRetired: true,
                        }}
                        size="md"
                        variant="retired"
                      />
                      <p className="text-sm text-yellow-700 italic">
                        Former yokozuna ceremonial rope, displayed as a symbol of the highest
                        achievement in sumo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* MENTORSHIP */}
        {mentorshipPairs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Stable Mentorship
              </CardTitle>
              <CardDescription>Mentor-mentee relationships within the stable.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mentorshipPairs.map((pair) => (
                  <div key={pair.mentor.id} className="p-4 bg-muted/30 rounded-lg">
                    <div className="font-medium mb-2">
                      <RikishiName
                        id={pair.mentor.id}
                        name={pair.mentor.shikona || pair.mentor.name || "Unknown"}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pair.mentees.map((mentee) => (
                        <Badge key={mentee.id} variant="outline" className="text-sm">
                          <RikishiName
                            id={mentee.id}
                            name={mentee.shikona || mentee.name || "Unknown"}
                          />{" "}
                          ({mentee.rank})
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ALL OYAKATA */}
        <Card>
          <CardHeader>
            <CardTitle>All Oyakata</CardTitle>
            <CardDescription>Browse all stable masters in the sumo world.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from(world.oyakata.values()).map((o) => {
                const heya = world.heyas.get(o.heyaId);
                const isSelected = o.id === selectedOyakata.id;
                return (
                  <Card
                    key={o.id}
                    className={`cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
                    onClick={() => setSelectedOyakata(o)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <SumoAvatar
                          config={o.avatarConfig}
                          size="sm"
                          showHairstyle={true}
                          fallback={o.name}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{o.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {heya ? <StableName id={heya.id} name={heya.name} /> : "Unknown Stable"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {o.archetype?.replace("_", " ")}
                        </Badge>
                        {o.highestRank && (
                          <Badge
                            variant={
                              o.highestRank.toLowerCase() === "yokozuna" ||
                              o.highestRank.toLowerCase() === "ozeki"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize text-xs"
                          >
                            {o.highestRank.toLowerCase() === "yokozuna" && (
                              <Crown className="h-3 w-3 mr-1" />
                            )}
                            {o.highestRank}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
