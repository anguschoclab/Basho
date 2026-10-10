/**
 * OyakataPageSections.tsx
 *
 * Sections of OyakataPage — trait grid, rikishi-career card,
 * stable mentorship, and the all-oyakata directory.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import type { Oyakata } from "@/engine/types/oyakata";
import type { WorldState } from "@/presenters/uiDigest";
import { Brain, Heart, Briefcase, Zap, Scale, Users, Crown, Award } from "lucide-react";
import { YokozunaTsunaDisplay } from "@/components/kesho/keshoComponents";
import { TRAIT_LABELS, toTraitBand } from "@/presenters/uiDigest";
import { RikishiName, StableName } from "@/components/ClickableName";
import { getHeya, getAllOyakata } from "@/presenters/worldAccess";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { SortMenu } from "@/components/ui/SortMenu";
import { compareBy } from "@/lib/sortUtils";
import { activationKeyHandler } from "@/lib/a11y";
import type { useOyakataSelection } from "@/hooks/useOyakataSelection";

type Sel = ReturnType<typeof useOyakataSelection>;

const OYAKATA_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" },
  { key: "tenure", label: "Tenure" },
];

const TRAIT_ITEMS = [
  { key: "ambition", label: "Ambition", icon: Zap },
  { key: "patience", label: "Patience", icon: Brain },
  { key: "risk", label: "Risk Tolerance", icon: Scale },
  { key: "tradition", label: "Tradition", icon: Briefcase },
  { key: "compassion", label: "Compassion", icon: Heart },
] as const;

/** Personality trait bars. */
export function TraitsCard({ oyakata }: { oyakata: Oyakata }) {
  const traits = oyakata.traits;
  const traitItems = TRAIT_ITEMS.map((t) => ({ ...t, value: traits[t.key] }));
  return (
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
  );
}

/** Career-as-rikishi card incl. the yokozuna tsuna display. */
export function CareerAsRikishiCard({ oyakata }: { oyakata: Oyakata }) {
  if (!oyakata.formerShikona && !oyakata.highestRank) return null;
  return (
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
          {oyakata.formerShikona && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Former Shikona</div>
              <div className="text-2xl font-bold">{oyakata.formerShikona}</div>
            </div>
          )}
          {oyakata.highestRank && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Highest Rank Achieved</div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    oyakata.highestRank.toLowerCase() === "yokozuna" ||
                    oyakata.highestRank.toLowerCase() === "ozeki"
                      ? "default"
                      : "outline"
                  }
                  className="text-lg capitalize"
                >
                  {oyakata.highestRank.toLowerCase() === "yokozuna" && (
                    <Crown className="h-4 w-4 mr-1" />
                  )}
                  {oyakata.highestRank}
                </Badge>
              </div>
            </div>
          )}
          {/* Former Yokozuna Tsuna Display */}
          {oyakata.highestRank?.toLowerCase() === "yokozuna" && (
            <div className="space-y-2 md:col-span-2 mt-4 p-4 bg-gold border border-gold rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gold">
                <Award className="h-4 w-4" />
                <span className="font-medium">Yokozuna Legacy</span>
              </div>
              <div className="flex items-center gap-4">
                <YokozunaTsunaDisplay
                  tsuna={{
                    rikishiId: oyakata.id,
                    conferredAt: { year: DEFAULT_START_YEAR, basho: "unknown" },
                    style: "traditional",
                    ropeColor: "gold_accented",
                    paperTassels: 5,
                    displayedOnProfile: true,
                    isRetired: true,
                  }}
                  size="md"
                  variant="retired"
                />
                <p className="text-sm text-gold italic">
                  Former yokozuna ceremonial rope, displayed as a symbol of the highest
                  achievement in sumo.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Stable mentor-mentee pairings card. */
export function MentorshipCard({ sel }: { sel: Sel }) {
  if (sel.mentorshipPairs.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Stable Mentorship
        </CardTitle>
        <CardDescription>Mentor-mentee relationships within the stable.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sel.mentorshipPairs.map((pair) => (
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
  );
}

/** Single directory card for one oyakata. */
function OyakataCard({
  o,
  world,
  isSelected,
  onSelect,
}: {
  o: Oyakata;
  world: WorldState;
  isSelected: boolean;
  onSelect: (o: Oyakata) => void;
}) {
  const heya = getHeya(world, o.heyaId);
  return (
    <Card
      className={`cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background ${isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
      onClick={() => onSelect(o)}
      role="button"
      tabIndex={0}
      onKeyDown={activationKeyHandler(() => onSelect(o))}
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
}

/** "All Oyakata" directory grid with sorting. */
export function OyakataDirectory({ sel }: { sel: Sel }) {
  if (!sel.world) return null;
  const world = sel.world;
  const all = getAllOyakata(world);
  const accessor: Record<string, (o: Oyakata) => string | number | undefined> = {
    name: (o) => o.name,
    age: (o) => o.age,
    tenure: (o) => o.yearsInCharge,
  };
  const fn = accessor[sel.sortKey];
  const sorted = fn ? [...all].sort((a, b) => compareBy(a, b, fn, sel.sortOrder)) : all;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Oyakata</CardTitle>
            <CardDescription>Browse all stable masters in the sumo world.</CardDescription>
          </div>
          <SortMenu
            options={OYAKATA_SORT_OPTIONS}
            storageKey="basho_sort_oyakata"
            defaultSortKey="name"
            defaultSortOrder="asc"
            onSortChange={(key, order) => {
              sel.setSortKey(key);
              sel.setSortOrder(order);
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((o) => (
            <OyakataCard
              key={o.id}
              o={o}
              world={world}
              isSelected={o.id === sel.selectedOyakata?.id}
              onSelect={sel.setSelectedOyakata}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
