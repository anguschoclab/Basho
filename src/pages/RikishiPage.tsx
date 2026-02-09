// RikishiPage.tsx
// Rikishi Profile Page - Individual wrestler details with fog of war
// Per Scouting Doc: "You never know the truth — only what the ring has allowed you to see."
//
// FIXES APPLIED (runtime + canon):
// - Works with updated scouting.ts: getScoutedAttributes(scouted, rikishi, seed)
// - Uses world.seed for deterministic fog (fallback-safe)
// - Fixes createScoutedView signature (obsCount + investment + currentWeek)
// - Removes broken “soft trait” placeholders and uses scoutedAttrs instead
// - Ensures rankNames fallback + avoids undefined lookups
// - Keeps favored kimarite lookup compatible with registry being array OR record
// - Keeps non-owned narratives fogged without crashing
// - Adds bout history from almanac (safe even if world.history missing)
// - Avoids navigation during render (prevents React warnings)

import { rngFromSeed } from "@/engine/rng";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import { KIMARITE_REGISTRY } from "@/engine/kimarite";
import { getCareerPhase } from "@/engine/training";
import { generateCareerRecord, type RikishiCareerRecord, type BashoPerformance } from "@/engine/almanac";
import {
  describeAttributeVerbose,
  describeAggressionVerbose,
  describeExperienceVerbose,
  describeStaminaVerbose,
  describeMomentumVerbose,
  describeCareerPhaseVerbose,
  describeArchetypeVerbose,
  describeStyleVerbose,
  describeInjuryVerbose
} from "@/engine/narrativeDescriptions";
import {
  RANK_NAMES,
  STYLE_NAMES,
  ARCHETYPE_NAMES,
  createScoutedView,
  getScoutedAttributes,
  describeScoutingLevel,
  type ScoutingInvestment
} from "@/engine/scouting";
import {
  Activity,
  ArrowLeft,
  Award,
  Flame,
  History,
  Ruler,
  Scale,
  Search,
  Shield,
  Swords,
  Target,
  Trophy,
  Zap
} from "lucide-react";
import { StableName } from "@/components/ClickableName";

function findKimariteById(id: string) {
  const anyReg = KIMARITE_REGISTRY as any;
  if (Array.isArray(anyReg)) return anyReg.find((k: any) => k?.id === id) || null;
  if (anyReg && typeof anyReg === "object") return anyReg[id] || null;
  return null;
}

function safeStr(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default function RikishiPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state } = useGame();
  const { world, playerHeyaId } = state;

  if (!world || !id) {
    return null;
  }

  const rikishi = world.rikishi.get(id);
  if (!rikishi) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Card className="paper">
          <CardHeader>
            <CardTitle>Rikishi not found</CardTitle>
            <CardDescription>The requested profile could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const heya = world.heyas.get(rikishi.heyaId);

  const rankNames =
    RANK_NAMES[rikishi.rank] || {
      ja: safeStr((RANK_HIERARCHY as any)?.[rikishi.rank]?.nameJa, String(rikishi.rank)),
      en: String(rikishi.rank)
    };

  const careerPhase = getCareerPhase(rikishi.experience);

  // Scouting - own stable wrestlers are fully scouted
  const isOwned = rikishi.heyaId === playerHeyaId;

  // Small baseline intel for non-owned so UI doesn't feel empty early game
  const baselineObserved = 1; // 1 watched bout worth of intel
  const baselineInvestment: ScoutingInvestment = "none";
  const currentWeek = (world as any).week ?? 0;

  const scouted = createScoutedView(
    rikishi,
    playerHeyaId ?? null,
    isOwned ? 999 : baselineObserved,
    baselineInvestment,
    currentWeek
  );

  // IMPORTANT: pass truth + seed for deterministic fog + no undefined crashes
  const seed = (world as any).seed || `world-${(world as any).id || "unknown"}`;
  const scoutedAttrs = getScoutedAttributes(scouted, rikishi, seed);
  const scoutingInfo = describeScoutingLevel(scouted.scoutingLevel);

  // Generate career record for bout history (almanac integration)
  const rng = rngFromSeed(seed, "ui", `career::${rikishi.id}`);
  const careerRecord: RikishiCareerRecord = generateCareerRecord(rikishi, world, () => rng.next());

  // Favored kimarite names (safe)
  const favoredMoves =
    (rikishi.favoredKimarite || [])
      .map((kid: string) => findKimariteById(kid))
      .filter(Boolean) as Array<NonNullable<ReturnType<typeof findKimariteById>>>;

  // Attribute narratives with icons - respect fog of war
  const attributeNarratives = isOwned
    ? [
        { label: "Power", icon: Flame, color: "text-destructive", narrative: describeAttributeVerbose("power", rikishi.power) },
        { label: "Speed", icon: Zap, color: "text-warning", narrative: describeAttributeVerbose("speed", rikishi.speed) },
        { label: "Balance", icon: Shield, color: "text-success", narrative: describeAttributeVerbose("balance", rikishi.balance) },
        { label: "Technique", icon: Target, color: "text-primary", narrative: describeAttributeVerbose("technique", rikishi.technique) }
      ]
    : [
        { label: "Power", icon: Flame, color: "text-destructive", narrative: scoutedAttrs.power?.narrative || "Hard to judge from a distance." },
        { label: "Speed", icon: Zap, color: "text-warning", narrative: scoutedAttrs.speed?.narrative || "Too little tape to be certain." },
        { label: "Balance", icon: Shield, color: "text-success", narrative: scoutedAttrs.balance?.narrative || "Footwork tells a partial story." },
        { label: "Technique", icon: Target, color: "text-primary", narrative: scoutedAttrs.technique?.narrative || "Technique remains unclear." }
      ];

  const archetypeInfo = ARCHETYPE_NAMES[rikishi.archetype] || {
    label: String(rikishi.archetype),
    labelJa: "",
    description: ""
  };
  const styleInfo = STYLE_NAMES[rikishi.style] || {
    label: String(rikishi.style),
    labelJa: "",
    description: ""
  };

  // Fog-of-war for “soft” traits: use scouting-layer narratives when not owned
  const temperamentText = isOwned
    ? describeAggressionVerbose(rikishi.aggression)
    : scoutedAttrs.aggression?.narrative || "Their temperament is still difficult to read.";

  const experienceText = isOwned
    ? describeExperienceVerbose(rikishi.experience)
    : scoutedAttrs.experience?.narrative || "Their experience is inferred from limited appearances.";

  // Conditioning isn't part of scouting.ts attributes, so keep it narrative-only + safe.
  const conditioningText = isOwned
    ? describeStaminaVerbose(rikishi.stamina)
    : "Conditioning is hard to assess without sustained observation.";

  // Safe physical fields (don’t crash if some are missing in older saves)
  const heightText =
    typeof (rikishi as any).height === "number" && isFinite((rikishi as any).height) ? `${(rikishi as any).height}cm` : "—";
  const weightText =
    typeof (rikishi as any).weight === "number" && isFinite((rikishi as any).weight) ? `${(rikishi as any).weight}kg` : "—";
  const nationalityText = safeStr((rikishi as any).nationality, "—");

  return (
    <>
      <Helmet>
        <title>{rikishi.shikona} — Rikishi Profile</title>
      </Helmet>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Header */}
        <div className="flex items-start gap-6">
          <div className={`w-2 h-24 rounded-full ${rikishi.side === "east" ? "bg-east" : "bg-west"}`} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-4xl font-bold truncate">{rikishi.shikona}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className={`rank-${rikishi.rank}`}>
                {rankNames.ja}
                {rikishi.rankNumber && ` ${rikishi.rankNumber}枚目`}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {rankNames.en}
                {rikishi.rankNumber ? ` ${rikishi.rankNumber}` : ""}
              </span>
              <span className="text-muted-foreground">{rikishi.side === "east" ? "東 East" : "西 West"}</span>
              {heya && (
                <span className="text-muted-foreground">
                  • <StableName id={heya.id} name={heya.name} />
                </span>
              )}
              {!heya && <span className="text-muted-foreground">• Unknown heya</span>}
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Ruler className="h-4 w-4" />
                {heightText}
              </span>
              <span className="flex items-center gap-1">
                <Scale className="h-4 w-4" />
                {weightText}
              </span>
              <span>{nationalityText}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-mono font-bold">
              {rikishi.careerWins}-{rikishi.careerLosses}
            </div>
            <div className="text-sm text-muted-foreground">Career Record</div>
            {rikishi.momentum !== 0 && (
              <div className={`mt-2 text-sm ${rikishi.momentum > 0 ? "text-success" : "text-destructive"}`}>
                {describeMomentumVerbose(rikishi.momentum)}
              </div>
            )}
          </div>
        </div>

        {/* Scouting Level Indicator */}
        <Card className="paper">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className={`h-5 w-5 ${scoutingInfo.color}`} />
                <div>
                  <div className={`font-medium ${scoutingInfo.color}`}>{scoutingInfo.label}</div>
                  <div className="text-xs text-muted-foreground">{scoutingInfo.description}</div>
                </div>
              </div>

              <div className="flex-1">
                <Progress value={scouted.scoutingLevel} className="h-2" />
              </div>

              <div className="text-right">
                <div className="text-lg font-mono font-bold">{Math.round(scouted.scoutingLevel)}%</div>
                <div className="text-xs text-muted-foreground">Intel</div>
              </div>

              {isOwned && (
                <Badge variant="default" className="ml-2">
                  Your Heya
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attributes - Narrative descriptions only */}
          <Card className="paper">
            <CardHeader>
              <CardTitle>Physical Profile</CardTitle>
              <CardDescription>Observations from training and competition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {attributeNarratives.map((attr) => (
                <div key={attr.label} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <attr.icon className={`h-4 w-4 ${attr.color}`} />
                    <span className="font-medium text-sm">{attr.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">{attr.narrative}</p>
                </div>
              ))}

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Temperament</span>
                  <p className="text-sm text-muted-foreground">{temperamentText}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Experience</span>
                  <p className="text-sm text-muted-foreground">{experienceText}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Conditioning</span>
                  <p className="text-sm text-muted-foreground">{conditioningText}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Style & Archetype */}
          <Card className="paper">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                Fighting Style
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <div className="text-2xl font-display">{styleInfo.labelJa}</div>
                  <div className="text-sm text-muted-foreground">{styleInfo.label}</div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <div className="text-2xl font-display">{archetypeInfo.labelJa}</div>
                  <div className="text-sm text-muted-foreground">{archetypeInfo.label}</div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{describeStyleVerbose(rikishi.style)}</p>
                <p className="text-sm text-muted-foreground">{describeArchetypeVerbose(rikishi.archetype)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Favored Kimarite */}
          <Card className="paper">
            <CardHeader>
              <CardTitle>Signature Moves</CardTitle>
              <CardDescription>Preferred finishing techniques</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {favoredMoves.map((move) => (
                  <div key={move.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="min-w-0">
                      <div className="font-display font-medium truncate">{move.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{move.nameJa}</div>
                    </div>
                    {"rarity" in (move as any) ? (
                      <Badge variant="outline" className="capitalize">
                        {(move as any).rarity}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        technique
                      </Badge>
                    )}
                  </div>
                ))}

                {favoredMoves.length === 0 && (
                  <p className="text-sm text-muted-foreground">No signature moves developed yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Career Status */}
          <Card className="paper">
            <CardHeader>
              <CardTitle>Career Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="text-lg font-display capitalize">{careerPhase} Phase</div>
                <p className="text-sm text-muted-foreground mt-1">{describeCareerPhaseVerbose(careerPhase)}</p>
              </div>

              {rikishi.injured && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <Activity className="h-4 w-4" />
                    <span className="font-medium">Injured</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{describeInjuryVerbose(rikishi.injuryWeeksRemaining)}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="text-sm font-medium mb-2">Current Basho</div>
                <div className="text-2xl font-mono">
                  {rikishi.currentBashoWins}-{rikishi.currentBashoLosses}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bout History - Almanac Integration */}
          <Card className="paper lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Basho History
              </CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-3 flex-wrap">
                  {careerRecord.yushoCount > 0 && (
                    <span className="flex items-center gap-1 text-gold">
                      <Trophy className="h-3 w-3" />
                      {careerRecord.yushoCount} Yūshō
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">Generated from Almanac</span>
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Career Achievements Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <div className="text-xl font-bold">{careerRecord.totalWins}</div>
                  <div className="text-xs text-muted-foreground">Career Wins</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <div className="text-xl font-bold">{careerRecord.totalLosses}</div>
                  <div className="text-xs text-muted-foreground">Career Losses</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <div className="text-xl font-bold">{careerRecord.junYushoCount}</div>
                  <div className="text-xs text-muted-foreground">Jun-Yūshō</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <div className="text-xl font-bold">{careerRecord.kinboshiCount}</div>
                  <div className="text-xs text-muted-foreground">Kinboshi</div>
                </div>
              </div>

              {/* Sansho Awards */}
              {(careerRecord.sanshoCounts.ginoSho > 0 ||
                careerRecord.sanshoCounts.kantosho > 0 ||
                careerRecord.sanshoCounts.shukunsho > 0) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {careerRecord.sanshoCounts.ginoSho > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      技能賞 Gino-shō ×{careerRecord.sanshoCounts.ginoSho}
                    </Badge>
                  )}
                  {careerRecord.sanshoCounts.kantosho > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      敢闘賞 Kantō-shō ×{careerRecord.sanshoCounts.kantosho}
                    </Badge>
                  )}
                  {careerRecord.sanshoCounts.shukunsho > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      殊勲賞 Shukunshō ×{careerRecord.sanshoCounts.shukunsho}
                    </Badge>
                  )}
                </div>
              )}

              {/* Recent Basho Performance */}
              <div className="text-sm font-medium mb-2">Recent Tournaments</div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-2">
                  {careerRecord.bashoHistory
                    .slice(-12)
                    .reverse()
                    .map((basho: BashoPerformance) => (
                      <div
                        key={`${basho.year}-${basho.bashoNumber}-${basho.rank}-${basho.rankNumber ?? "x"}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-xs text-muted-foreground w-24 shrink-0">
                            {basho.bashoName.charAt(0).toUpperCase() + basho.bashoName.slice(1)} {basho.year}
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {basho.rank}
                            {basho.rankNumber ? ` ${basho.rankNumber}` : ""}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-sm ${
                              basho.wins > basho.losses
                                ? "text-success"
                                : basho.wins < basho.losses
                                  ? "text-destructive"
                                  : ""
                            }`}
                          >
                            {basho.wins}-{basho.losses}
                          </span>

                          {basho.yusho && (
                            <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              Yūshō
                            </Badge>
                          )}
                          {basho.junYusho && <Badge variant="secondary" className="text-xs">Jun</Badge>}
                        </div>
                      </div>
                    ))}

                  {careerRecord.bashoHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tournament history available yet.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
