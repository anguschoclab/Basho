/**
 * OyakataPageSections.tsx
 *
 * Shared elder-profile sections — personality trait grid and the
 * career-as-rikishi card. Rendered by OyakataProfilePage; private
 * intel sections are gated there before inclusion.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Oyakata } from "@/engine/types/oyakata";
import { Brain, Heart, Briefcase, Zap, Scale, Crown, Award } from "lucide-react";
import { YokozunaTsunaDisplay } from "@/components/kesho/keshoComponents";
import { TRAIT_LABELS, toTraitBand } from "@/presenters/uiDigest";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { isYokozunaOrOzekiRank } from "@/constants/engine/rankDisplay";

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
        <CardDescription>Former wrestling career before becoming a stable master.</CardDescription>
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
                    isYokozunaOrOzekiRank(oyakata.highestRank.toLowerCase())
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
                  Former yokozuna ceremonial rope, displayed as a symbol of the highest achievement
                  in sumo.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
