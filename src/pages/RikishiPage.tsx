// RikishiPage.tsx — Full Redesign
// Clean, FM-inspired rikishi profile with clear hierarchy and fog of war
// Uses projectRikishi() DTO for basic field display; raw Rikishi for scouting/career gen.

import { rngFromSeed } from "@/engine/rng";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import { KIMARITE_REGISTRY } from "@/engine/kimarite";
import { generateCareerRecord, type RikishiCareerRecord, type BashoPerformance } from "@/engine/almanac";
import { projectRikishi } from "@/engine/uiModels";
import {
  describeAttributeVerbose,
  describeAggressionVerbose,
  describeStaminaVerbose,
  describeMomentumVerbose,
  describeCareerPhaseVerbose,
  describeArchetypeVerbose,
  describeStyleVerbose,
  describeInjuryVerbose
} from "@/engine/narrativeDescriptions";
import { POTENTIAL_LABELS } from "@/engine/descriptorBands";
import {
  RANK_NAMES,
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
  Zap,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  User,
  MapPin,
  Calendar,
} from "lucide-react";
import { StableName } from "@/components/ClickableName";

function findKimariteById(id: string) {
  const anyReg = KIMARITE_REGISTRY as any;
  if (Array.isArray(anyReg)) return anyReg.find((k: any) => k?.id === id) || null;
  if (anyReg && typeof anyReg === "object") return anyReg[id] || null;
  return null;
}

function StatBar({ label, value, max = 100, icon: Icon, color }: {
  label: string; value: number; max?: number; icon: any; color: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className={`h-3 w-3 ${color}`} />
          {label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all`} style={{ width: `${pct}%`, background: `hsl(var(--primary))` }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${className || ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function RikishiPage() {
  const navigate = useNavigate();
  const { rikishiId } = useParams<{ rikishiId: string }>();
  const { state } = useGame();
  const { world, playerHeyaId } = state;

  if (!world || !rikishiId) return null;

  const rikishi = world.rikishi.get(rikishiId);
  if (!rikishi) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="paper">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">Rikishi not found</p>
            <Button variant="outline" onClick={() => navigate("/")}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Project DTO for display fields
  const ui = projectRikishi(rikishi, world);

  const heya = world.heyas.get(rikishi.heyaId);
  const isOwned = rikishi.heyaId === playerHeyaId;

  const rankNames = RANK_NAMES[rikishi.rank] || {
    ja: String(rikishi.rank),
    en: String(rikishi.rank)
  };

  const seed = world.seed || `world-${world.id || "unknown"}`;

  // Scouting (needs raw rikishi)
  const currentWeek = world.week ?? 0;
  const scouted = createScoutedView(
    rikishi, playerHeyaId ?? null,
    isOwned ? 999 : 1, "none" as ScoutingInvestment, currentWeek
  );
  const scoutedAttrs = getScoutedAttributes(scouted, rikishi, seed);
  const scoutingInfo = describeScoutingLevel(scouted.scoutingLevel);

  // Career record (needs raw rikishi + world)
  const rng = rngFromSeed(seed, "ui", `career::${rikishi.id}`);
  const careerRecord: RikishiCareerRecord = generateCareerRecord(rikishi, world, () => rng.next());

  // Kimarite
  const favoredMoves = (ui.favoredKimarite || [])
    .map((kid: string) => findKimariteById(kid))
    .filter(Boolean) as Array<NonNullable<ReturnType<typeof findKimariteById>>>;

  const winRate = ui.careerWins + ui.careerLosses > 0
    ? ((ui.careerWins / (ui.careerWins + ui.careerLosses)) * 100).toFixed(1)
    : "—";

  const potInfo = ui.potentialBand !== "unknown" ? POTENTIAL_LABELS[ui.potentialBand] : null;

  // Attribute narratives (needs raw rikishi for owned, scouted for unowned)
  const attrs = isOwned
    ? [
        { label: "Power", icon: Flame, color: "text-destructive", val: rikishi.power, narrative: describeAttributeVerbose("power", rikishi.power) },
        { label: "Speed", icon: Zap, color: "text-warning", val: rikishi.speed, narrative: describeAttributeVerbose("speed", rikishi.speed) },
        { label: "Balance", icon: Shield, color: "text-success", val: rikishi.balance, narrative: describeAttributeVerbose("balance", rikishi.balance) },
        { label: "Technique", icon: Target, color: "text-primary", val: rikishi.technique, narrative: describeAttributeVerbose("technique", rikishi.technique) },
      ]
    : [
        { label: "Power", icon: Flame, color: "text-destructive", val: null, narrative: scoutedAttrs.power?.narrative || "Hard to judge from a distance." },
        { label: "Speed", icon: Zap, color: "text-warning", val: null, narrative: scoutedAttrs.speed?.narrative || "Too little tape to be certain." },
        { label: "Balance", icon: Shield, color: "text-success", val: null, narrative: scoutedAttrs.balance?.narrative || "Footwork tells a partial story." },
        { label: "Technique", icon: Target, color: "text-primary", val: null, narrative: scoutedAttrs.technique?.narrative || "Technique remains unclear." },
      ];

  return (
    <>
      <Helmet><title>{ui.shikona} — Profile</title></Helmet>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Top bar */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        {/* ═══════════════ HERO SECTION ═══════════════ */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card">
          {/* Rank color bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${
            ui.rank === "yokozuna" ? "bg-gradient-to-r from-amber-400 to-amber-600"
            : ui.rank === "ozeki" ? "bg-gradient-to-r from-slate-400 to-slate-500"
            : ["sekiwake", "komusubi"].includes(ui.rank) ? "bg-gradient-to-r from-amber-700 to-amber-800"
            : "bg-border"
          }`} />

          <div className="p-6 pt-5">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Left: Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Badge className={`rank-${ui.rank} text-xs`}>
                    {rankNames.ja}{ui.rankNumber ? ` ${ui.rankNumber}枚目` : ""}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ui.side === "east" ? "東 East" : "西 West"}
                  </span>
                  {isOwned && <Badge variant="default" className="text-[10px] h-5">YOUR STABLE</Badge>}
                </div>

                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{ui.shikona}</h1>

                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                  {heya && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      <StableName id={heya.id} name={ui.heyaName} />
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {ui.nationality}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Age {ui.age}
                  </span>
                  <span className="flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5" /> {ui.height}cm
                  </span>
                  <span className="flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5" /> {ui.weight}kg
                  </span>
                </div>

                {potInfo && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-[10px]" title={potInfo.description}>
                      ✦ {potInfo.label}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Right: Key numbers */}
              <div className="flex gap-6 md:gap-8 shrink-0">
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold tracking-tight">
                    {ui.currentBashoRecord}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">This Basho</div>
                </div>
                <Separator orientation="vertical" className="h-12 self-center" />
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold tracking-tight">
                    {ui.careerRecord}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Career ({winRate}%)</div>
                </div>
                {(careerRecord.yushoCount > 0) && (
                  <>
                    <Separator orientation="vertical" className="h-12 self-center" />
                    <div className="text-center">
                      <div className="text-3xl font-mono font-bold tracking-tight text-gold">{careerRecord.yushoCount}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Yūshō</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Momentum & injury strip */}
            {(ui.momentum !== 0 || ui.isInjured) && (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
                {ui.momentum !== 0 && (
                  <Badge variant="outline" className={ui.momentum > 0 ? "border-success/30 text-success" : "border-destructive/30 text-destructive"}>
                    {ui.momentum > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {describeMomentumVerbose(ui.momentum)}
                  </Badge>
                )}
                {ui.isInjured && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <Activity className="h-3 w-3" /> {ui.injurySummary}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ SCOUTING BAR ═══════════════ */}
        {!isOwned && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-muted/30">
            {scouted.scoutingLevel >= 70 ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${scoutingInfo.color}`}>{scoutingInfo.label}</span>
                <span className="text-[10px] text-muted-foreground">{scouted.scoutingLevel}%</span>
              </div>
              <Progress value={scouted.scoutingLevel} className="h-1 mt-1" />
            </div>
          </div>
        )}

        {/* ═══════════════ MAIN GRID ═══════════════ */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* COL 1: Attributes */}
          <Card className="paper">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Physical Profile</h3>

              {isOwned ? (
                <div className="space-y-3">
                  {attrs.map(a => (
                    <StatBar key={a.label} label={a.label} value={a.val!} icon={a.icon} color={a.color} />
                  ))}
                  <Separator />
                  <StatBar label="Stamina" value={rikishi.stamina} icon={Activity} color="text-muted-foreground" />
                  <StatBar label="Experience" value={rikishi.experience} icon={History} color="text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {attrs.map(a => (
                    <div key={a.label} className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <a.icon className={`h-3 w-3 ${a.color}`} />
                        {a.label}
                      </div>
                      <p className="text-xs text-muted-foreground/80 pl-4 italic">{a.narrative}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Soft traits */}
              <Separator />
              <div className="space-y-2">
                <InfoRow label="Temperament" value={
                  <span className="text-xs">{isOwned ? describeAggressionVerbose(rikishi.aggression) : scoutedAttrs.aggression?.narrative || "Difficult to read"}</span>
                } />
                <InfoRow label="Conditioning" value={
                  <span className="text-xs">{isOwned ? describeStaminaVerbose(rikishi.stamina) : "Hard to assess"}</span>
                } />
                <InfoRow label="Career Phase" value={
                  <Badge variant="outline" className="text-[10px] capitalize">{ui.careerPhase}</Badge>
                } />
              </div>
            </CardContent>
          </Card>

          {/* COL 2: Style + Kimarite */}
          <Card className="paper">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5" /> Fighting Style
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xl font-display">{ui.styleName}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{ui.style}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xl font-display">{ui.archetypeName}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{ui.archetype}</div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{describeStyleVerbose(rikishi.style)}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{describeArchetypeVerbose(rikishi.archetype)}</p>

              <Separator />

              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signature Techniques</h3>
              <div className="space-y-2">
                {favoredMoves.map(move => (
                  <div key={move.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30">
                    <div>
                      <span className="text-sm font-display font-medium">{move.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{move.nameJa}</span>
                    </div>
                    {"rarity" in (move as any) && (
                      <Badge variant="outline" className="text-[9px] capitalize">{(move as any).rarity}</Badge>
                    )}
                  </div>
                ))}
                {favoredMoves.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No signature moves developed yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* COL 3: Career Stats */}
          <Card className="paper">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Career Summary
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-lg font-mono font-bold">{careerRecord.totalWins}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Wins</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-lg font-mono font-bold">{careerRecord.totalLosses}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Losses</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-lg font-mono font-bold">{careerRecord.junYushoCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Jun-Yūshō</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-lg font-mono font-bold">{careerRecord.kinboshiCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Kinboshi</div>
                </div>
              </div>

              {/* Sansho */}
              {(careerRecord.sanshoCounts.ginoSho > 0 || careerRecord.sanshoCounts.kantosho > 0 || careerRecord.sanshoCounts.shukunsho > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {careerRecord.sanshoCounts.ginoSho > 0 && (
                    <Badge variant="outline" className="text-[9px] gap-1"><Award className="h-2.5 w-2.5" /> 技能賞 ×{careerRecord.sanshoCounts.ginoSho}</Badge>
                  )}
                  {careerRecord.sanshoCounts.kantosho > 0 && (
                    <Badge variant="outline" className="text-[9px] gap-1"><Award className="h-2.5 w-2.5" /> 敢闘賞 ×{careerRecord.sanshoCounts.kantosho}</Badge>
                  )}
                  {careerRecord.sanshoCounts.shukunsho > 0 && (
                    <Badge variant="outline" className="text-[9px] gap-1"><Award className="h-2.5 w-2.5" /> 殊勲賞 ×{careerRecord.sanshoCounts.shukunsho}</Badge>
                  )}
                </div>
              )}

              <Separator />

              {/* Recent basho */}
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Tournaments</h3>
              <ScrollArea className="h-[240px]">
                <div className="space-y-1.5 pr-2">
                  {careerRecord.bashoHistory.slice(-12).reverse().map((b: BashoPerformance) => (
                    <div
                      key={`${b.year}-${b.bashoNumber}-${b.rank}-${b.rankNumber ?? "x"}`}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground w-20 shrink-0">
                          {b.bashoName.charAt(0).toUpperCase() + b.bashoName.slice(1)} {b.year}
                        </span>
                        <Badge variant="outline" className="text-[9px] capitalize h-4 px-1">
                          {b.rank}{b.rankNumber ? ` ${b.rankNumber}` : ""}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs ${
                          b.wins > b.losses ? "text-success" : b.wins < b.losses ? "text-destructive" : ""
                        }`}>
                          {b.wins}-{b.losses}
                        </span>
                        {b.yusho && <Trophy className="h-3 w-3 text-gold" />}
                        {b.junYusho && <Badge variant="secondary" className="text-[8px] h-3.5 px-1">Jun</Badge>}
                      </div>
                    </div>
                  ))}
                  {careerRecord.bashoHistory.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">No tournament history yet.</p>
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
